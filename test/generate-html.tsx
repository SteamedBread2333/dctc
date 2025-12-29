import { renderToString } from 'react-dom/server'
import React from 'react'
import Page from './src'
import fs from 'fs';
import path from 'path';

const work = () => {
  const html = renderToString(<Page fontColor="pink" />)
  fs.writeFileSync(path.join(__dirname, 'page.html'), html);
  return html
}
work()
