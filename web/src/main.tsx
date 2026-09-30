import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Admin, PrintCups } from './pages/Admin';
import { Home } from './pages/Home';
import { CupDeepLink, StationDeepLink } from './pages/DeepLinks';
import { Student } from './pages/Student';
import { Station, Vendor } from './pages/Vendor';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/me" element={<Student />} />
        <Route path="/c/:code" element={<CupDeepLink />} />
        <Route path="/s/:vendorId/:code" element={<StationDeepLink />} />
        <Route path="/vendor" element={<Vendor />} />
        <Route path="/vendor/station" element={<Station />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/print" element={<PrintCups />} />
        <Route path="*" element={<main className="page"><p>Không tìm thấy trang. <Link to="/">Về trang chủ</Link></p></main>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
