import '@fontsource-variable/nunito';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ConsoleApp, PrintLabels } from './console/ConsoleApp';
import { LangProvider } from './i18n';
import { Landing } from './Landing';
import { Celebrate } from './student/Celebrate';
import { CupDeepLink, StationDeepLink } from './student/DeepLinks';
import { Home } from './student/Home';
import { Journey } from './student/Journey';
import { League } from './student/League';
import { Onboarding } from './student/Onboarding';
import { Profile } from './student/Profile';
import { RegisterCup } from './student/RegisterCup';
import { Rewards } from './student/Rewards';
import { Scan } from './student/Scan';
import { StudentSession } from './student/session';
import { HelpTab } from './vendor/HelpTab';
import { ScanTab } from './vendor/ScanTab';
import { Station } from './vendor/Station';
import { TodayTab } from './vendor/TodayTab';
import { VendorApp } from './vendor/VendorApp';
import './styles/base.css';
import './styles/student.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <BrowserRouter>
        <StudentSession>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/welcome" element={<Onboarding />} />
            <Route path="/me" element={<Home />} />
            <Route path="/me/scan" element={<Scan />} />
            <Route path="/me/celebrate/:scanId" element={<Celebrate />} />
            <Route path="/me/journey" element={<Journey />} />
            <Route path="/me/league" element={<League />} />
            <Route path="/me/rewards" element={<Rewards />} />
            <Route path="/me/profile" element={<Profile />} />
            <Route path="/me/register-cup" element={<RegisterCup />} />
            <Route path="/c/:code" element={<CupDeepLink />} />
            <Route path="/s/:vendorId/:code" element={<StationDeepLink />} />
            <Route path="/vendor/station" element={<Station />} />
            <Route path="/vendor" element={<VendorApp />}>
              <Route index element={<ScanTab />} />
              <Route path="today" element={<TodayTab />} />
              <Route path="help" element={<HelpTab />} />
            </Route>
            <Route path="/admin/print" element={<PrintLabels />} />
            <Route path="/admin/*" element={<ConsoleApp />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </StudentSession>
      </BrowserRouter>
    </LangProvider>
  </StrictMode>,
);
