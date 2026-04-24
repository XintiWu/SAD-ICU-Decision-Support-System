import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { NurseOverviewPage } from './pages/NurseOverviewPage'
import { NurseTodoPage } from './pages/NurseTodoPage'
import { BurdenFormPage } from './pages/BurdenFormPage'
import { HandoverPage } from './pages/HandoverPage'
import { ReportsPage } from './pages/ReportsPage'
import { ChargeAllocationPage } from './pages/ChargeAllocationPage'
import { WarRoomPage } from './pages/WarRoomPage'

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/nurse/overview" replace />} />
        <Route path="/nurse/overview" element={<NurseOverviewPage />} />
        <Route path="/nurse/handover" element={<HandoverPage />} />
        <Route path="/nurse/todo" element={<NurseTodoPage />} />
        <Route path="/nurse/burden-form" element={<BurdenFormPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/leader/allocation" element={<ChargeAllocationPage />} />
        <Route path="/leader/war-room" element={<WarRoomPage />} />
        <Route path="*" element={<Navigate to="/nurse/overview" replace />} />
      </Routes>
    </AppShell>
  )
}

export default App
