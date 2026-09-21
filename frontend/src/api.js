const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const KEYS = {
  token: 'rfq_access_token',
  users: 'rfq_users',
  rfqs: 'rfq_items',
  quotations: 'rfq_quotations',
  session: 'rfq_session'
}

const seed = () => {
  if (!localStorage.getItem(KEYS.users)) {
    localStorage.setItem(KEYS.users, JSON.stringify([
      { id: 1, name: 'Demo Buyer', email: 'buyer@demo.com', password: 'Buyer@123', role: 'BUYER' },
      { id: 2, name: 'Demo Supplier', email: 'supplier@demo.com', password: 'Supplier@123', role: 'SUPPLIER' }
    ]))
  }
  if (!localStorage.getItem(KEYS.rfqs)) {
    localStorage.setItem(KEYS.rfqs, JSON.stringify([
      {
        id: 1001,
        buyer_id: 1,
        buyer_name: 'Demo Buyer',
        product_name: 'Business Laptops',
        description: 'Need business-grade laptops for a growing software team.',
        quantity: 50,
        delivery_location: 'Hyderabad, Telangana',
        deadline: '2026-09-30',
        status: 'OPEN',
        created_at: new Date().toISOString()
      },
      {
        id: 1002,
        buyer_id: 1,
        buyer_name: 'Demo Buyer',
        product_name: 'Office Chairs',
        description: 'Ergonomic office chairs with adjustable lumbar support.',
        quantity: 100,
        delivery_location: 'Bengaluru, Karnataka',
        deadline: '2026-10-05',
        status: 'OPEN',
        created_at: new Date().toISOString()
      }
    ]))
  }
  if (!localStorage.getItem(KEYS.quotations)) {
    localStorage.setItem(KEYS.quotations, JSON.stringify([]))
  }
}

seed()

const get = (key) => JSON.parse(localStorage.getItem(key) || '[]')
const set = (key, value) => localStorage.setItem(key, JSON.stringify(value))
const session = () => JSON.parse(localStorage.getItem(KEYS.session) || 'null')

const mockDelay = (value, ms = 350) => new Promise(resolve => setTimeout(() => resolve(value), ms))

async function request(path, options = {}) {
  if (!API_BASE_URL) return null
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(localStorage.getItem(KEYS.token) ? { Authorization: `Bearer ${localStorage.getItem(KEYS.token)}` } : {}), ...(options.headers || {}) },
    ...options
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'API request failed')
  return data
}

export async function register(payload) {
  if (API_BASE_URL) { const data = await request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }); localStorage.setItem(KEYS.token, data.access_token); localStorage.setItem(KEYS.session, JSON.stringify(data.user)); return data }
  const users = get(KEYS.users)
  if (users.some(u => u.email.toLowerCase() === payload.email.toLowerCase())) throw new Error('Email is already registered')
  const user = { id: Date.now(), ...payload }
  users.push(user); set(KEYS.users, users)
  localStorage.setItem(KEYS.session, JSON.stringify(user))
  return mockDelay({ user })
}

export async function login(payload) {
  if (API_BASE_URL) { const data = await request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }); localStorage.setItem(KEYS.token, data.access_token); localStorage.setItem(KEYS.session, JSON.stringify(data.user)); return data }
  const user = get(KEYS.users).find(u => u.email.toLowerCase() === payload.email.toLowerCase() && u.password === payload.password)
  if (!user) throw new Error('Invalid email or password')
  localStorage.setItem(KEYS.session, JSON.stringify(user))
  return mockDelay({ user })
}

export function logout() {
  localStorage.removeItem(KEYS.session); localStorage.removeItem(KEYS.token)
}

export function currentUser() {
  return session()
}

export async function listRFQs({ search = '', location = '', status = 'OPEN' } = {}) {
  if (API_BASE_URL) {
    const params = new URLSearchParams({ search, location, status })
    return request(`/api/rfqs?${params.toString()}`)
  }
  let rfqs = get(KEYS.rfqs).map(normalizeRFQ)
  if (status) rfqs = rfqs.filter(r => r.status === status)
  if (search) {
    const q = search.toLowerCase()
    rfqs = rfqs.filter(r => `${r.product_name} ${r.description} ${r.delivery_location}`.toLowerCase().includes(q))
  }
  if (location) rfqs = rfqs.filter(r => r.delivery_location.toLowerCase().includes(location.toLowerCase()))
  return mockDelay(rfqs)
}

export async function getRFQ(id) {
  if (API_BASE_URL) return request(`/api/rfqs/${id}`)
  const rfq = get(KEYS.rfqs).find(r => String(r.id) === String(id))
  if (!rfq) throw new Error('RFQ not found')
  return mockDelay(normalizeRFQ(rfq))
}

export async function createRFQ(payload) {
  if (API_BASE_URL) return request('/api/rfqs', { method: 'POST', body: JSON.stringify(payload) })
  const user = session()
  validateRFQ(payload)
  const rfq = {
    id: Date.now(), buyer_id: user.id, buyer_name: user.name,
    ...payload, quantity: Number(payload.quantity), status: 'OPEN', created_at: new Date().toISOString()
  }
  const rfqs = get(KEYS.rfqs); rfqs.unshift(rfq); set(KEYS.rfqs, rfqs)
  return mockDelay(normalizeRFQ(rfq))
}

export async function updateRFQ(id, payload) {
  if (API_BASE_URL) return request(`/api/rfqs/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
  validateRFQ(payload)
  const user = session(); const rfqs = get(KEYS.rfqs); const idx = rfqs.findIndex(r => String(r.id) === String(id))
  if (idx < 0) throw new Error('RFQ not found')
  if (rfqs[idx].buyer_id !== user.id) throw new Error('You can only edit your own RFQs')
  rfqs[idx] = { ...rfqs[idx], ...payload, quantity: Number(payload.quantity), updated_at: new Date().toISOString() }
  set(KEYS.rfqs, rfqs)
  return mockDelay(normalizeRFQ(rfqs[idx]))
}

export async function deleteRFQ(id) {
  if (API_BASE_URL) return request(`/api/rfqs/${id}`, { method: 'DELETE' })
  const user = session(); const rfqs = get(KEYS.rfqs)
  const rfq = rfqs.find(r => String(r.id) === String(id))
  if (!rfq || rfq.buyer_id !== user.id) throw new Error('You can only delete your own RFQs')
  set(KEYS.rfqs, rfqs.filter(r => String(r.id) !== String(id)))
  set(KEYS.quotations, get(KEYS.quotations).filter(q => String(q.rfq_id) !== String(id)))
  return mockDelay({ success: true })
}

export async function listBuyerRFQs() {
  const user = session()
  if (API_BASE_URL) return request('/api/buyer/rfqs')
  return mockDelay(get(KEYS.rfqs).filter(r => r.buyer_id === user.id).map(normalizeRFQ))
}

export async function submitQuotation(rfqId, payload) {
  if (API_BASE_URL) return request(`/api/rfqs/${rfqId}/quotations`, { method: 'POST', body: JSON.stringify(payload) })
  const user = session(); const rfq = get(KEYS.rfqs).find(r => String(r.id) === String(rfqId))
  if (!rfq) throw new Error('RFQ not found')
  if (rfq.buyer_id === user.id) throw new Error('Buyers cannot quote on their own RFQ')
  if (new Date(rfq.deadline) < new Date(new Date().toISOString().slice(0,10))) throw new Error('This RFQ deadline has expired')
  const quotes = get(KEYS.quotations)
  if (quotes.some(q => q.rfq_id === Number(rfqId) && q.supplier_id === user.id)) throw new Error('You already submitted a quotation')
  if (Number(payload.quoted_price) < 0 || Number(payload.estimated_delivery_days) <= 0) throw new Error('Enter valid price and delivery time')
  const quote = { id: Date.now(), rfq_id: Number(rfqId), supplier_id: user.id, supplier_name: user.name, ...payload, quoted_price: Number(payload.quoted_price), estimated_delivery_days: Number(payload.estimated_delivery_days), created_at: new Date().toISOString() }
  quotes.unshift(quote); set(KEYS.quotations, quotes)
  return mockDelay(quote)
}

export async function listRFQQuotations(rfqId) {
  if (API_BASE_URL) return request(`/api/rfqs/${rfqId}/quotations`)
  const user = session(); const rfq = get(KEYS.rfqs).find(r => String(r.id) === String(rfqId))
  if (!rfq || rfq.buyer_id !== user.id) throw new Error('You are not allowed to view these quotations')
  return mockDelay(get(KEYS.quotations).filter(q => q.rfq_id === Number(rfqId)))
}

export async function listSupplierQuotations() {
  if (API_BASE_URL) return request('/api/supplier/quotations')
  const user = session()
  return mockDelay(get(KEYS.quotations).filter(q => q.supplier_id === user.id).map(q => ({ ...q, rfq: get(KEYS.rfqs).find(r => r.id === q.rfq_id) })))
}

export async function updateExpiredRFQs() {
  if (API_BASE_URL) return request('/api/rfqs/expire', { method: 'POST' })
  const today = new Date(new Date().toISOString().slice(0,10)); const rfqs = get(KEYS.rfqs)
  let changed = false
  rfqs.forEach(r => { if (r.status === 'OPEN' && new Date(r.deadline) < today) { r.status = 'CLOSED'; changed = true } })
  if (changed) set(KEYS.rfqs, rfqs)
}

function normalizeRFQ(r) {
  const today = new Date(new Date().toISOString().slice(0,10))
  if (r.status === 'OPEN' && new Date(r.deadline) < today) return { ...r, status: 'CLOSED' }
  return r
}

function validateRFQ(p) {
  if (!p.product_name?.trim() || p.product_name.trim().length < 2) throw new Error('Product/service name is required')
  if (!p.description?.trim() || p.description.trim().length < 10) throw new Error('Description must be at least 10 characters')
  if (!Number.isFinite(Number(p.quantity)) || Number(p.quantity) <= 0) throw new Error('Quantity must be greater than 0')
  if (!p.delivery_location?.trim()) throw new Error('Delivery location is required')
  if (!p.deadline || new Date(p.deadline) <= new Date(new Date().toISOString().slice(0,10))) throw new Error('Deadline must be in the future')
}
