// Acesso de servidor ao Firestore (conta de serviço), para os robôs agendados
// do GitHub Actions. A credencial vem da variável FIREBASE_SERVICE_ACCOUNT
// (JSON) ou de GOOGLE_APPLICATION_CREDENTIALS.
import { cert, initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const raw = process.env.FIREBASE_SERVICE_ACCOUNT
initializeApp(raw ? { credential: cert(JSON.parse(raw)) } : { credential: applicationDefault(), projectId: 'comovotar' })

export const db = getFirestore()
