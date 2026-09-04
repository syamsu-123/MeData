import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

const map = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
const readableError = (error) => error?.code === 'permission-denied' ? 'Anda tidak memiliki izin untuk melakukan tindakan ini.' : 'Data tidak dapat diproses. Periksa koneksi internet Anda.'

export const subscribeStudents = (callback, onError) => onSnapshot(query(collection(db, 'students'), orderBy('name')), (snap) => callback(map(snap)), (error) => onError(readableError(error)))
export const saveStudent = async (id, values, uid) => {
  const payload = { ...values, updatedAt: serverTimestamp() }
  if (id) return updateDoc(doc(db, 'students', id), payload)
  return addDoc(collection(db, 'students'), { ...payload, studentId: values.studentId || `MD-${Date.now().toString().slice(-6)}`, status: values.status || 'active', createdBy: uid, createdAt: serverTimestamp() })
}
export const removeStudent = (id) => deleteDoc(doc(db, 'students', id))
export const importStudents = async (rows, uid) => {
  const stamp = Date.now().toString().slice(-6)
  for (let start = 0; start < rows.length; start += 400) {
    const batch = writeBatch(db)
    rows.slice(start, start + 400).forEach((row, index) => {
      const ref = doc(collection(db, 'students'))
      batch.set(ref, {
        ...row,
        studentId: `MD-${stamp}${start + index}`,
        status: 'active',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
    await batch.commit()
  }
  await logActivity(uid, 'IMPORT_STUDENTS', `${rows.length} siswa diimpor dari Excel`)
  return rows.length
}
export const subscribeVisits = (locationId, callback, onError) => {
  const clauses = [where('locationId', '==', locationId), orderBy('createdAt', 'desc')]
  return onSnapshot(query(collection(db, 'visits'), ...clauses), (snap) => callback(map(snap)), (error) => onError(readableError(error)))
}
export const subscribeAllVisits = (callback, onError) => onSnapshot(query(collection(db, 'visits'), orderBy('createdAt', 'desc')), (snap) => callback(map(snap)), (error) => onError(readableError(error)))
export async function checkIn(student, locationId, notes, uid) {
  const existing = await getDocs(query(collection(db, 'visits'), where('studentId', '==', student.id), where('status', '==', 'ACTIVE'), limit(1)))
  if (!existing.empty) throw new Error('Siswa sedang berada di lokasi pelayanan.')
  const now = new Date()
  await addDoc(collection(db, 'visits'), { studentId: student.id, studentName: student.name, nis: student.nis || '', studentClass: student.class || '', locationId, checkIn: now.toISOString(), checkOut: null, duration: null, status: 'ACTIVE', notes: notes || '', createdBy: uid, createdAt: serverTimestamp() })
  return logActivity(uid, 'CHECK_IN', `${student.name} melakukan check-in ke ${locationId.toUpperCase()}`)
}
export async function checkOut(visit, uid) {
  const out = new Date(); const duration = Math.max(0, Math.round((out - new Date(visit.checkIn)) / 60000))
  await updateDoc(doc(db, 'visits', visit.id), { checkOut: out.toISOString(), duration, status: 'COMPLETED' })
  return logActivity(uid, 'CHECK_OUT', `${visit.studentName} melakukan check-out`)
}
export const logActivity = (userId, action, description) =>
  addDoc(collection(db, 'activity_logs'), {
    userId,
    action,
    description,
    createdAt: serverTimestamp(),
  })

export const subscribeActivityLogs = (callback, onError) =>
  onSnapshot(
    query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc'), limit(50)),
    (snap) => callback(map(snap)),
    (error) => onError(readableError(error)),
  )

export const ADMIN_EMAILS = [
  'syamsumaulida1@gmail.com',
  'adminmedata@gmail.com',
]

export const isAdminEmail = (email) => {
  if (!email) return false
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase())
}

export const getUserProfile = async (uid) => {
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? snapshot.data() : { role: 'viewer', name: '' }
}

export const syncUserProfile = async (user) => {
  if (!user) return null
  const userRef = doc(db, 'users', user.uid)
  const snap = await getDoc(userRef)
  const email = user.email || ''
  const isWhitelistedAdmin = isAdminEmail(email)

  if (snap.exists()) {
    const existingData = snap.data()
    // Jika email terdaftar di whitelist admin tapi role di Firestore masih viewer/petugas, upgrade otomatis ke admin
    if (isWhitelistedAdmin && existingData.role !== 'admin') {
      await updateDoc(userRef, {
        role: 'admin',
        updatedAt: serverTimestamp(),
      })
      await logActivity(
        user.uid,
        'ROLE_AUTO_UPGRADE',
        `${email} otomatis ditingkatkan menjadi Admin (Whitelist)`,
      )
      return { ...existingData, role: 'admin' }
    }
    return existingData
  }

  // Jika dokumen pengguna belum pernah dibuat
  const assignedRole = isWhitelistedAdmin ? 'admin' : 'viewer'
  const newProfile = {
    name: user.displayName || email.split('@')[0] || 'Pengguna MeData',
    email,
    role: assignedRole,
    photoURL: user.photoURL || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  await setDoc(userRef, newProfile)
  await logActivity(
    user.uid,
    'USER_CREATED',
    `${newProfile.name} (${email}) terdaftar dengan role ${assignedRole.toUpperCase()}`,
  )
  return newProfile
}

export const ensureGoogleUserProfile = (user) => syncUserProfile(user)

export const createUserProfile = async (user, role = 'viewer') => {
  const email = (user.email || '').toLowerCase()
  const newProfile = {
    name: user.displayName || email.split('@')[0] || 'Pengguna MeData',
    email,
    role: isAdminEmail(email) ? 'admin' : role,
    photoURL: user.photoURL || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  await setDoc(doc(db, 'users', user.uid), newProfile)
  await logActivity(
    user.uid,
    'USER_CREATED',
    `${newProfile.name} (${email}) terdaftar dengan role ${newProfile.role.toUpperCase()}`,
  )
  return newProfile
}

export const subscribeUsers = (callback, onError) =>
  onSnapshot(
    query(collection(db, 'users')),
    (snap) => callback(map(snap)),
    (error) => onError(readableError(error)),
  )

export const updateUserRole = (userId, role) =>
  updateDoc(doc(db, 'users', userId), {
    role,
    updatedAt: serverTimestamp(),
  })

export const saveUserProfile = (userId, data) =>
  updateDoc(doc(db, 'users', userId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
