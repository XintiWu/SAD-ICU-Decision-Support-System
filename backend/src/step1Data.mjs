export const ids = {
  currentShift: '00000000-0000-0000-0000-000000000201',
  currentNurse: '00000000-0000-0000-0000-000000000101',
  chargeNurse: '00000000-0000-0000-0000-000000000110',
}

export const users = [
  { id: '00000000-0000-0000-0000-000000000101', name: '王小明', role: 'nurse', employeeNo: 'N001' },
  { id: '00000000-0000-0000-0000-000000000102', name: '陳美麗', role: 'nurse', employeeNo: 'N002' },
  { id: '00000000-0000-0000-0000-000000000103', name: '林志強', role: 'nurse', employeeNo: 'N003' },
  { id: '00000000-0000-0000-0000-000000000104', name: '張雅婷', role: 'nurse', employeeNo: 'N004' },
  { id: '00000000-0000-0000-0000-000000000105', name: '李家豪', role: 'nurse', employeeNo: 'N005' },
  { id: '00000000-0000-0000-0000-000000000106', name: '吳佩珊', role: 'nurse', employeeNo: 'N006' },
  { id: '00000000-0000-0000-0000-000000000107', name: '周柏宇', role: 'nurse', employeeNo: 'N007' },
  { id: '00000000-0000-0000-0000-000000000108', name: '黃思涵', role: 'nurse', employeeNo: 'N008' },
  { id: '00000000-0000-0000-0000-000000000109', name: '何俊傑', role: 'nurse', employeeNo: 'N009' },
  { id: '00000000-0000-0000-0000-000000000110', name: '李小華', role: 'charge_nurse', employeeNo: 'N010' },
]

export const nurses = [
  { id: '00000000-0000-0000-0000-000000000101', displayName: '護理師 A - 王小明', shortName: '王小明', isActive: true },
  { id: '00000000-0000-0000-0000-000000000102', displayName: '護理師 B - 陳美麗', shortName: '陳美麗', isActive: true },
  { id: '00000000-0000-0000-0000-000000000103', displayName: '護理師 C - 林志強', shortName: '林志強', isActive: true },
  { id: '00000000-0000-0000-0000-000000000104', displayName: '護理師 D - 張雅婷', shortName: '張雅婷', isActive: true },
  { id: '00000000-0000-0000-0000-000000000105', displayName: '護理師 E - 李家豪', shortName: '李家豪', isActive: true },
  { id: '00000000-0000-0000-0000-000000000106', displayName: '護理師 F - 吳佩珊', shortName: '吳佩珊', isActive: true },
  { id: '00000000-0000-0000-0000-000000000107', displayName: '護理師 G - 周柏宇', shortName: '周柏宇', isActive: true },
  { id: '00000000-0000-0000-0000-000000000108', displayName: '護理師 H - 黃思涵', shortName: '黃思涵', isActive: true },
  { id: '00000000-0000-0000-0000-000000000109', displayName: '護理師 I - 何俊傑', shortName: '何俊傑', isActive: true },
  { id: '00000000-0000-0000-0000-000000000110', displayName: '小組長 李小華', shortName: '李小華', isActive: true },
]

export const shifts = [
  {
    id: ids.currentShift,
    unitName: 'ICU',
    shiftKey: 'day',
    startsAt: '2026-05-08T06:00:00+08:00',
    endsAt: '2026-05-08T14:00:00+08:00',
    chargeNurseId: ids.chargeNurse,
    status: 'open',
  },
]

export const shiftNurses = [
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000101', role: 'nurse' },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000102', role: 'nurse' },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000103', role: 'nurse' },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000104', role: 'nurse' },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000105', role: 'nurse' },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000106', role: 'nurse' },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000107', role: 'nurse' },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000108', role: 'nurse' },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000109', role: 'nurse' },
  { shiftId: ids.currentShift, nurseId: ids.chargeNurse, role: 'charge_nurse' },
]

export const beds = Array.from({ length: 17 }, (_, index) => {
  const bedNo = index + 1
  return {
    id: `00000000-0000-0000-0000-${String(300 + bedNo).padStart(12, '0')}`,
    unitName: 'ICU',
    bedNo,
    label: `床 ${bedNo}`,
    isActive: true,
  }
})

export const patients = [
  { id: '00000000-0000-0000-0000-000000000401', medicalRecordNo: 'MR000001', name: '陳志豪', sex: '男', birthDate: '1958-01-01' },
  { id: '00000000-0000-0000-0000-000000000402', medicalRecordNo: 'MR000002', name: '林淑芬', sex: '女', birthDate: '1952-01-01' },
  { id: '00000000-0000-0000-0000-000000000403', medicalRecordNo: 'MR000003', name: '王建翔', sex: '男', birthDate: '1974-01-01' },
  { id: '00000000-0000-0000-0000-000000000404', medicalRecordNo: 'MR000004', name: '吳佩蓉', sex: '女', birthDate: '1945-01-01' },
  { id: '00000000-0000-0000-0000-000000000405', medicalRecordNo: 'MR000005', name: '李明哲', sex: '男', birthDate: '1949-01-01' },
  { id: '00000000-0000-0000-0000-000000000406', medicalRecordNo: 'MR000006', name: '周雅婷', sex: '女', birthDate: '1960-01-01' },
  { id: '00000000-0000-0000-0000-000000000407', medicalRecordNo: 'MR000007', name: '郭柏霖', sex: '男', birthDate: '1967-01-01' },
  { id: '00000000-0000-0000-0000-000000000408', medicalRecordNo: 'MR000008', name: '許心怡', sex: '女', birthDate: '1956-01-01' },
  { id: '00000000-0000-0000-0000-000000000409', medicalRecordNo: 'MR000009', name: '黃冠廷', sex: '男', birthDate: '1963-01-01' },
  { id: '00000000-0000-0000-0000-000000000410', medicalRecordNo: 'MR000010', name: '吳怡君', sex: '女', birthDate: '1981-01-01' },
  { id: '00000000-0000-0000-0000-000000000411', medicalRecordNo: 'MR000011', name: '邱子豪', sex: '男', birthDate: '1993-01-01' },
  { id: '00000000-0000-0000-0000-000000000412', medicalRecordNo: 'MR000012', name: '蔡佩珊', sex: '女', birthDate: '1968-01-01' },
  { id: '00000000-0000-0000-0000-000000000413', medicalRecordNo: 'MR000013', name: '鄭文彥', sex: '男', birthDate: '1954-01-01' },
  { id: '00000000-0000-0000-0000-000000000414', medicalRecordNo: 'MR000014', name: '何冠廷', sex: '女', birthDate: '1962-01-01' },
  { id: '00000000-0000-0000-0000-000000000415', medicalRecordNo: 'MR000015', name: '杜承恩', sex: '男', birthDate: '1970-01-01' },
  { id: '00000000-0000-0000-0000-000000000416', medicalRecordNo: 'MR000016', name: '蘇雅婷', sex: '女', birthDate: '1965-01-01' },
  { id: '00000000-0000-0000-0000-000000000417', medicalRecordNo: 'MR000017', name: '方志豪', sex: '男', birthDate: '1977-01-01' },
]

const admissionRows = [
  ['ARDS', '2026-04-22', '張志明醫師'],
  ['敗血症', '2026-04-20', '林怡君醫師'],
  ['術後照護', '2026-04-24', '王建宏醫師'],
  ['COPD 急性惡化', '2026-04-18', '陳美玲醫師'],
  ['心衰竭急性惡化', '2026-04-19', '李承翰醫師'],
  ['腦中風（急性期）', '2026-04-23', '周雅雯醫師'],
  ['肺炎併呼吸衰竭', '2026-04-21', '郭柏宏醫師'],
  ['上消化道出血', '2026-04-25', '許心怡醫師'],
  ['腎衰竭（洗腎評估）', '2026-04-17', '黃冠霖醫師'],
  ['糖尿病酮酸中毒', '2026-04-26', '吳怡婷醫師'],
  ['多發外傷（術後）', '2026-04-16', '邱子豪醫師'],
  ['胰臟炎（重症）', '2026-04-15', '蔡佩珊醫師'],
  ['敗血性休克', '2026-04-14', '鄭文彥醫師'],
  ['心肌梗塞（PCI 後）', '2026-04-13', '何冠廷醫師'],
  ['腸阻塞（術前）', '2026-04-12', '杜承恩醫師'],
  ['肝硬化併腹水', '2026-04-11', '蘇雅婷醫師'],
  ['感染性腦膜炎', '2026-04-10', '方志豪醫師'],
]

export const admissions = admissionRows.map(([diagnosis, admittedAt, attendingPhysician], index) => {
  const no = index + 1
  return {
    id: `00000000-0000-0000-0000-${String(500 + no).padStart(12, '0')}`,
    patientId: `00000000-0000-0000-0000-${String(400 + no).padStart(12, '0')}`,
    bedId: `00000000-0000-0000-0000-${String(300 + no).padStart(12, '0')}`,
    diagnosis,
    admittedAt,
    attendingPhysician,
    status: 'active',
  }
})

export const currentAssignments = [
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000101', admissionIds: ['00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000507'] },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000102', admissionIds: ['00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000506'] },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000103', admissionIds: ['00000000-0000-0000-0000-000000000512'] },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000104', admissionIds: ['00000000-0000-0000-0000-000000000501'] },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000105', admissionIds: ['00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000513'] },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000106', admissionIds: ['00000000-0000-0000-0000-000000000508'] },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000107', admissionIds: ['00000000-0000-0000-0000-000000000510'] },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000108', admissionIds: ['00000000-0000-0000-0000-000000000511'] },
  { shiftId: ids.currentShift, nurseId: '00000000-0000-0000-0000-000000000109', admissionIds: ['00000000-0000-0000-0000-000000000515', '00000000-0000-0000-0000-000000000516'] },
]

