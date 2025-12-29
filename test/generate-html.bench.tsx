import { renderToString } from 'react-dom/server'
import React from 'react'
import Page from './src'

const work = () => {
  const html = renderToString(<Page fontColor="pink" />)
  return html
}

// Keep output similar to generate-html.tsx, but do NOT write to disk.
;(globalThis as any).__dctc_last_html = work()

