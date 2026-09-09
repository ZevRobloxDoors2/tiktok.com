/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { Upload } from './pages/Upload';
import { Profile } from './pages/Profile';
import { Inbox } from './pages/Inbox';
import { Chat } from './pages/Chat';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/profile/:handle" element={<Profile />} />
            <Route path="/messages" element={<Inbox />} />
            <Route path="/messages/:handle" element={<Chat />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppProvider>
  );
}
