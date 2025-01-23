# dynamic-compile-tsx-commond(dctc)
Dynamically compile TSX/TS file and execute it.

## Usage
```
dctc [options] <file>
```

## Options
```
-h, --help      display help for command
-v, --version   output the version number
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

#### generate-html.tsx

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

### You now have `page.html`, which looks like this

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

### Open the file in your browser and you'll see

<img width="441" alt="image" src="https://github.com/user-attachments/assets/67d82e20-81e8-4a98-8bb6-0175efd2bb30" />


## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
Please make sure to update tests as appropriate.

## License
MIT
