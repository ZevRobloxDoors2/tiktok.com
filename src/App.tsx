/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useAppStore } from './store';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { Upload } from './pages/Upload';
import { Profile } from './pages/Profile';
import { Inbox } from './pages/Inbox';
import { Chat } from './pages/Chat';
import { BanScreen } from './components/BanScreen';
import { InterestsModal } from './components/InterestsModal';
import { Admin } from './pages/Admin';
import { Forum } from './pages/Forum';

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAppStore();
  
  if (currentUser?.banStatus) {
    const isTemp = currentUser.banStatus.type === 'temp';
    if (!isTemp || (isTemp && currentUser.banStatus.until && Date.now() < currentUser.banStatus.until)) {
      return <BanScreen />;
    }
  }
  
  return (
    <>
      {children}
      <InterestsModal />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AuthWrapper>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/profile/:handle" element={<Profile />} />
              <Route path="/messages" element={<Inbox />} />
              <Route path="/messages/:handle" element={<Chat />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Layout>
        </AuthWrapper>
      </HashRouter>
    </AppProvider>
  );
}
