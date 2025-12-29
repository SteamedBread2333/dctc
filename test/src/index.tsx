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
