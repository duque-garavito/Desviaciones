import React from 'react';
import { FOOTER_TEXT } from '../config';

export default function Footer({ className = 'app-footer' }) {
  return (
    <footer className={className}>
      {FOOTER_TEXT}
    </footer>
  );
}
