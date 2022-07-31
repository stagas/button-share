import $ from 'sigl'

import { compressUrlSafe, decompressUrlSafe } from 'urlsafe-lzma'

export type ButtonShareEvents = {
  ready: CustomEvent
  share: CustomEvent<{
    didWriteClipboard: boolean
  }>
  opened: CustomEvent<{
    serializedState: string
  }>
}

export interface ButtonShareElement extends $.Element<ButtonShareElement, ButtonShareEvents> {}

@$.element({ extends: 'button' })
export class ButtonShareElement extends $(HTMLButtonElement) {
  @$.attr() mode = 9
  @$.attr() enableEndMark = false
  @$.attr() hashPrefix = 's='

  getSerializedState?: () => string
  openURL?: (url: Location | URL) => void

  mounted($: ButtonShareElement['$']) {
    $.effect(({ host, mode, enableEndMark, hashPrefix, getSerializedState }) =>
      $.on(host).click(() => {
        const serializedState = getSerializedState()
        const result = compressUrlSafe(serializedState, { mode, enableEndMark })

        const url = new URL(location.href)
        url.hash = hashPrefix + result
        history.pushState({}, '', url)

        let didWriteClipboard = false
        if (document.hasFocus()) {
          navigator.clipboard.writeText(location.href)
          didWriteClipboard = true
        }

        $.dispatch(host, 'share', { didWriteClipboard })
      })
    )

    $.openURL = $.reduce(({ host, hashPrefix }) =>
      url => {
        try {
          if (url.hash.includes(hashPrefix)) {
            const compressedString = (url.hash.split(hashPrefix)[1] ?? '').split('&')[0]
            if (!compressedString.length) return

            const serializedState = decompressUrlSafe(compressedString)
            $.dispatch(host, 'opened', { serializedState })
          }
        } finally {
          $.dispatch(host, 'ready')
        }
      }
    )

    $.effect(({ openURL }) =>
      $.on(window).popstate(() => {
        openURL(location)
      })
    )

    $.effect.once.debounce(100)(({ openURL }) => {
      openURL(location)
    })
  }
}
