import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { NurseOverviewPage } from './pages/NurseOverviewPage'
import { NurseTodoPage } from './pages/NurseTodoPage'
import { BurdenFormPage } from './pages/BurdenFormPage'
import { ChargeAllocationPage } from './pages/ChargeAllocationPage'
import { WarRoomPage } from './pages/WarRoomPage'
import { AllocationResultPage } from './pages/AllocationResultPage'
import { OrdersImportPage } from './pages/OrdersImportPage'
import { HandoverSnapshotsPage } from './pages/HandoverSnapshotsPage'
import { ShiftProvider } from './context/ShiftContext'

function App() {
  return (
    <ShiftProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/nurse/overview" replace />} />
          <Route path="/nurse/overview" element={<NurseOverviewPage />} />
          <Route path="/nurse/todo" element={<NurseTodoPage />} />
          <Route path="/nurse/stat" element={<NurseTodoPage />} />
          <Route path="/nurse/burden-form" element={<BurdenFormPage />} />
          <Route path="/orders/import" element={<OrdersImportPage />} />
          <Route path="/leader/allocation" element={<ChargeAllocationPage />} />
          <Route path="/leader/allocation-result" element={<AllocationResultPage />} />
          <Route path="/leader/war-room" element={<WarRoomPage />} />
          <Route path="/leader/handover-snapshots" element={<HandoverSnapshotsPage />} />
          <Route path="*" element={<Navigate to="/nurse/overview" replace />} />
        </Routes>
      </AppShell>
    </ShiftProvider>
  )
}

export default App