<h1 align="center">
  <br/>
    <img src="https://github.com/user-attachments/assets/df254f50-3f84-4e16-abc3-a7334bd6e577" width="260"/>
  <br/>
</h1>

[![npm version](https://img.shields.io/npm/v/dctc.svg?style=for-the-badge)](https://www.npmjs.com/package/dctc)
[![npm downloads](https://img.shields.io/npm/d18m/wecipher.svg?style=for-the-badge)](https://www.npmjs.com/package/dctc)
[![deps](https://img.shields.io/github/license/SteamedBread2333/dctc.svg?style=for-the-badge)](https://www.npmjs.com/package/dctc)

TypeScript Execute (tsx): Dynamically compile TSX/TS file and execute it.

`dctc` may be similar tools in the fastest speed of execution!!  <img src="https://emojis.slackmojis.com/emojis/images/1643514389/3643/cool-doge.gif?1643514389" width="30"/>

## Usage
```
dctc [options] <file>
```

## Options
```
-h, --help                    display help for command
-v, --version                 output the version number
-c, --compiler <name>         specify compiler: es, swc, rollup, rolldown (default: es)
```

## Installation
```shell
npm install -g dctc
```

## Example

### Step 1: Create Source Files

Create a `src` directory and add the following files:

#### `src/index.tsx`

```tsx
import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';

const Page: React.FC<{ fontColor: string }> = (props) => {
  return (
    <div style={{ color: props?.fontColor || '#fff' }}>
      <Header />
      <main>
        <h1>Hello, World!</h1>
        <p>This is a dynamically compiled TSX file using dctc.</p>
      </main>
      <Footer />
    </div>
  );
};

export default Page;
```

#### `src/components/Header.tsx`

```tsx
import React from 'react';

const Header: React.FC = () => {
  return (
    <header>
      <h2>Welcome to the DCTC Example</h2>
    </header>
  );
};

export default Header;
```

#### `src/components/Footer.tsx`

```tsx
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer>
      <p>&copy; 2025 DCTC Example</p>
    </footer>
  );
};

export default Footer;
```

### Step 2: Create a tsx script file

#### `/generate-html.tsx`

```tsx
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
```

### Step 3: Enter the following command

```shell
dctc generate-html.tsx
```

Or specify a compiler:

```shell
dctc --compiler swc generate-html.tsx
dctc --compiler rollup generate-html.tsx
dctc -c rolldown generate-html.tsx
```

#### The `page.html` file has been generated, and it looks like this

```html
<div style="color:pink">
  <header>
    <h2>Welcome to the DCTC Example</h2>
  </header>
  <main>
    <h1>Hello, World!</h1>
    <p>This is a dynamically compiled TSX file using dctc.</p>
  </main>
  <footer>
    <p>© 2025 DCTC Example</p>
  </footer>
</div>
```

#### Open the file `page.html` with your browser

<img width="441" alt="image" src="https://github.com/user-attachments/assets/67d82e20-81e8-4a98-8bb6-0175efd2bb30" />


## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
Please make sure to update tests as appropriate.

## Scene
Some scenarios where you need to compile and execute tsx. 
- Developed using react, and needed to generate an html template for email.
- When you want to preview a react component, but there is no suitable playground.

## Performance (ASCII)

Benchmark setup:
- Entry: `test/generate-html.bench.tsx` (same as `test/generate-html.tsx`, but does **not** write files)
- Per compiler: **compile 1x + execute 10000x**

Raw numbers:

```
compiler   compile(ms)  exec_total(ms)  exec_avg(ms)  ops(/s)
swc        13.5         1922.8         0.1923       5200.7
es         13.1         2438.2         0.2438       4101.4
rollup     850.4        6817.4         0.6817       1466.8
rolldown   318.1        7709.3         0.7709       1297.1
```

Visuals (pure ASCII):

Compile time (ms)  [lower is better]  (scale: max=850.4ms => 40 cols)

```
compiler  value    bar
es        13.1ms  |#                                       |
swc       13.5ms  |#                                       |
rolldown  318.1ms |###############                         |
rollup    850.4ms |########################################|
```

Execution avg (ms) [lower is better] (scale: max=0.7709ms => 40 cols)

```
compiler  value      bar
swc       0.1923ms |##########                              |
es        0.2438ms |#############                           |
rollup    0.6817ms |###################################     |
rolldown  0.7709ms |########################################|
```

Throughput (ops/s) [higher is better] (scale: max=5200.7/s => 40 cols)

```
compiler  value     bar
swc       5200.7/s |########################################|
es        4101.4/s |###############################         |
rollup    1466.8/s |###########                             |
rolldown  1297.1/s |##########                              |
```

## Notice
If you need to load the style file, perform an additional loader and eventually insert the style into the html template in the product, but the email template does not support external style import.

## License
MIT
