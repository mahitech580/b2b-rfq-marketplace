import React, { useEffect, useMemo, useState } from 'react'
import { Routes, Route, Link, useLocation, useNavigate, Navigate, useParams } from 'react-router-dom'
import {
  currentUser, login, register, logout, listRFQs, getRFQ, createRFQ, updateRFQ, deleteRFQ,
  listBuyerRFQs, submitQuotation, listRFQQuotations, listSupplierQuotations, updateExpiredRFQs
} from './api'

function Layout({ user, onLogout, children }) {
  const nav = useNavigate(); const location = useLocation()
  return <div className="app-shell">
    <header className="topbar">
      <Link className="brand" to={user?.role === 'BUYER' ? '/buyer' : '/supplier'}><span className="brand-mark">R</span> RFQ Marketplace</Link>
      <nav className="nav-links">
        {user?.role === 'BUYER' ? <><Link className={location.pathname.includes('/buyer') ? 'active' : ''} to="/buyer">Dashboard</Link><Link to="/buyer/rfqs/new">Create RFQ</Link></> : <><Link className={location.pathname.includes('/supplier') ? 'active' : ''} to="/supplier">Browse RFQs</Link><Link to="/supplier/quotations">My Quotations</Link></>}
      </nav>
      <div className="user-menu"><div className="avatar">{user?.name?.charAt(0)?.toUpperCase()}</div><span>{user?.name}</span><span className="role-pill">{user?.role}</span><button className="ghost-button" onClick={() => { logout(); onLogout(); nav('/login') }}>Logout</button></div>
    </header>
    <main className="page">{children}</main>
  </div>
}

function Protected({ role, children }) {
  const user = currentUser()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'BUYER' ? '/buyer' : '/supplier'} replace />
  return children
}

function AuthPage({ mode, onAuth }) {
  const navigate = useNavigate(); const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'BUYER' })
  const isRegister = mode === 'register'
  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const data = isRegister ? await register(form) : await login({ email: form.email, password: form.password })
      onAuth(data.user); navigate(data.user.role === 'BUYER' ? '/buyer' : '/supplier')
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  return <div className="auth-shell">
    <div className="auth-card">
      <div className="auth-brand"><span className="brand-mark large">R</span><div><div className="eyebrow">B2B PROCUREMENT</div><h1>RFQ Marketplace</h1></div></div>
      <p className="muted">{isRegister ? 'Create your account to post RFQs or submit quotations.' : 'Sign in to manage RFQs and supplier quotations.'}</p>
      {error && <div className="alert error">{error}</div>}
      <form onSubmit={submit} className="form-grid">
        {isRegister && <Field label="Full name"><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Kondaveeti Sai Mahendra" /></Field>}
        <Field label="Email"><input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" /></Field>
        <Field label="Password"><input required type="password" minLength="8" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Minimum 8 characters" /></Field>
        {isRegister && <Field label="Account role"><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="BUYER">Buyer</option><option value="SUPPLIER">Supplier</option></select></Field>}
        <button className="primary full" disabled={loading}>{loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}</button>
      </form>
      <div className="auth-switch">{isRegister ? 'Already have an account?' : 'New to the marketplace?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create account'}</Link></div>
      <div className="demo-box"><b>Demo accounts</b><span>Buyer: buyer@demo.com / Buyer@123</span><span>Supplier: supplier@demo.com / Supplier@123</span></div>
    </div>
  </div>
}

function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label> }
function PageTitle({ title, subtitle, action }) { return <div className="page-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div> }
function Stat({ label, value }) { return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div> }
function Empty({ title, body }) { return <div className="empty"><div className="empty-icon">∅</div><h3>{title}</h3><p>{body}</p></div> }
function Loading() { return <div className="loading"><span className="spinner"></span> Loading…</div> }

function BuyerDashboard() {
  const [rfqs, setRfqs] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  useEffect(() => { (async () => { try { await updateExpiredRFQs(); setRfqs(await listBuyerRFQs()) } catch(e) { setError(e.message) } finally { setLoading(false) } })() }, [])
  const open = rfqs.filter(r => r.status === 'OPEN').length
  return <Layout user={currentUser()} onLogout={() => location.reload()}>
    <PageTitle title="Buyer dashboard" subtitle="Create and manage requests for quotation." action={<Link className="primary" to="/buyer/rfqs/new">+ Create RFQ</Link>} />
    <div className="stats"><Stat label="Total RFQs" value={rfqs.length} /><Stat label="Open RFQs" value={open} /><Stat label="Closed RFQs" value={rfqs.length - open} /></div>
    {error && <div className="alert error">{error}</div>}
    <section className="panel"><div className="panel-head"><div><h3>My RFQs</h3><p>Requests you have posted.</p></div></div>
      {loading ? <Loading /> : rfqs.length ? <div className="table-wrap"><table><thead><tr><th>Product / service</th><th>Quantity</th><th>Location</th><th>Deadline</th><th>Status</th><th></th></tr></thead><tbody>{rfqs.map(r => <tr key={r.id}><td><b>{r.product_name}</b><small>{r.description}</small></td><td>{r.quantity}</td><td>{r.delivery_location}</td><td>{formatDate(r.deadline)}</td><td><span className={`status ${r.status.toLowerCase()}`}>{r.status}</span></td><td><Link className="text-link" to={`/buyer/rfqs/${r.id}`}>Open →</Link></td></tr>)}</tbody></table></div> : <Empty title="No RFQs yet" body="Create your first RFQ and start collecting supplier quotations." />}
    </section>
  </Layout>
}

function RFQForm({ edit = false }) {
  const { id } = useParams(); const navigate = useNavigate(); const [loading, setLoading] = useState(edit); const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const [form, setForm] = useState({ product_name: '', description: '', quantity: '', delivery_location: '', deadline: '' })
  useEffect(() => { if (!edit) return; (async () => { try { const r = await getRFQ(id); setForm({ product_name: r.product_name, description: r.description, quantity: r.quantity, delivery_location: r.delivery_location, deadline: r.deadline }) } catch(e) { setError(e.message) } finally { setLoading(false) } })() }, [id, edit])
  const submit = async e => { e.preventDefault(); setError(''); setSaving(true); try { edit ? await updateRFQ(id, form) : await createRFQ(form); navigate('/buyer') } catch(e) { setError(e.message) } finally { setSaving(false) } }
  if (loading) return <Layout user={currentUser()} onLogout={() => location.reload()}><Loading /></Layout>
  return <Layout user={currentUser()} onLogout={() => location.reload()}><PageTitle title={edit ? 'Edit RFQ' : 'Create RFQ'} subtitle="Give suppliers the information they need to respond accurately." /><section className="panel narrow"><div className="panel-head"><div><h3>Requirement details</h3></div></div>{error && <div className="alert error">{error}</div>}<form onSubmit={submit} className="form-grid two-col"><Field label="Product / service name"><input required value={form.product_name} onChange={e=>setForm({...form, product_name:e.target.value})} placeholder="e.g. Business laptops" /></Field><Field label="Quantity"><input required type="number" min="1" value={form.quantity} onChange={e=>setForm({...form, quantity:e.target.value})} placeholder="50" /></Field><Field label="Delivery location"><input required value={form.delivery_location} onChange={e=>setForm({...form, delivery_location:e.target.value})} placeholder="Hyderabad, Telangana" /></Field><Field label="RFQ deadline"><input required type="date" value={form.deadline} min={todayPlusOne()} onChange={e=>setForm({...form, deadline:e.target.value})} /></Field><div className="field full-span"><span>Description</span><textarea required minLength="10" rows="6" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} placeholder="Describe the specification, quality, packaging or service requirements." /></div><div className="form-actions"><button type="button" className="secondary" onClick={()=>navigate('/buyer')}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : edit ? 'Save changes' : 'Publish RFQ'}</button></div></form></section></Layout>
}

function BuyerRFQDetails() {
  const { id } = useParams(); const navigate = useNavigate(); const [rfq, setRfq] = useState(null); const [quotes, setQuotes] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const load = async () => { try { const r = await getRFQ(id); setRfq(r); setQuotes(await listRFQQuotations(id)) } catch(e) { setError(e.message) } finally { setLoading(false) } }
  useEffect(()=>{load()},[id])
  const remove = async () => { if (!confirm('Delete this RFQ?')) return; try { await deleteRFQ(id); navigate('/buyer') } catch(e) { setError(e.message) } }
  if (loading) return <Layout user={currentUser()} onLogout={() => location.reload()}><Loading /></Layout>
  if (!rfq) return <Layout user={currentUser()} onLogout={() => location.reload()}><div className="alert error">{error || 'RFQ not found'}</div></Layout>
  return <Layout user={currentUser()} onLogout={() => location.reload()}><PageTitle title={rfq.product_name} subtitle={`Posted ${formatDate(rfq.created_at)}`} action={<div className="button-row"><Link className="secondary" to={`/buyer/rfqs/${id}/edit`}>Edit</Link><button className="danger" onClick={remove}>Delete</button></div>} />{error && <div className="alert error">{error}</div>}<div className="detail-grid"><section className="panel"><div className="detail-top"><span className={`status ${rfq.status.toLowerCase()}`}>{rfq.status}</span><span>Deadline: <b>{formatDate(rfq.deadline)}</b></span></div><p className="detail-description">{rfq.description}</p><div className="info-grid"><Info label="Quantity" value={rfq.quantity} /><Info label="Delivery location" value={rfq.delivery_location} /></div></section><section className="panel"><div className="panel-head"><div><h3>Received quotations</h3><p>{quotes.length} supplier response{quotes.length===1?'':'s'}</p></div></div>{quotes.length ? <div className="quote-list">{quotes.map(q => <div className="quote-card" key={q.id}><div className="quote-head"><b>{q.supplier_name}</b><strong>₹{Number(q.quoted_price).toLocaleString('en-IN')}</strong></div><div className="quote-meta">Delivery in {q.estimated_delivery_days} days</div><p>{q.message || 'No notes provided.'}</p></div>)}</div> : <Empty title="No quotations yet" body="Supplier responses will appear here after they quote on this RFQ." />}</section></div></Layout>
}

function SupplierDashboard() {
  const [rfqs, setRfqs] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [search, setSearch] = useState(''); const [location, setLocation] = useState('')
  const load = async () => { setLoading(true); setError(''); try { await updateExpiredRFQs(); setRfqs(await listRFQs({search, location, status:'OPEN'})) } catch(e) { setError(e.message) } finally { setLoading(false) } }
  useEffect(()=>{load()},[])
  return <Layout user={currentUser()} onLogout={() => location.reload()}><PageTitle title="Browse RFQs" subtitle="Discover open business requirements and submit quotations." /><section className="filterbar"><div className="field"><span>Search</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Laptop, packaging, software…" /></div><div className="field"><span>Location</span><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Hyderabad" /></div><button className="primary align-end" onClick={load}>Search</button></section>{error && <div className="alert error">{error}</div>}{loading ? <Loading /> : rfqs.length ? <div className="rfq-grid">{rfqs.map(r => <article className="rfq-card" key={r.id}><div className="card-row"><span className="status open">OPEN</span><span className="deadline">Due {formatDate(r.deadline)}</span></div><h3>{r.product_name}</h3><p>{r.description}</p><div className="rfq-meta"><span><b>Qty</b>{r.quantity}</span><span><b>Location</b>{r.delivery_location}</span></div><Link className="primary full" to={`/supplier/rfqs/${r.id}`}>View RFQ</Link></article>)}</div> : <div className="panel"><Empty title="No matching RFQs" body="Try a different keyword or location." /></div>}</Layout>
}

function SupplierRFQDetails() {
  const { id } = useParams(); const navigate = useNavigate(); const [rfq,setRfq]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [saving,setSaving]=useState(false)
  const [form,setForm]=useState({quoted_price:'',estimated_delivery_days:'',message:''})
  useEffect(()=>{(async()=>{try{setRfq(await getRFQ(id))}catch(e){setError(e.message)}finally{setLoading(false)}})()},[id])
  const submit=async e=>{e.preventDefault();setSaving(true);setError('');try{await submitQuotation(id,form);navigate('/supplier/quotations')}catch(e){setError(e.message)}finally{setSaving(false)}}
  if(loading)return <Layout user={currentUser()} onLogout={()=>location.reload()}><Loading/></Layout>
  if(!rfq)return <Layout user={currentUser()} onLogout={()=>location.reload()}><div className="alert error">{error||'RFQ not found'}</div></Layout>
  return <Layout user={currentUser()} onLogout={()=>location.reload()}><Link className="back-link" to="/supplier">← Back to RFQs</Link><div className="detail-grid supplier-detail"><section className="panel"><div className="detail-top"><span className={`status ${rfq.status.toLowerCase()}`}>{rfq.status}</span><span>Deadline: <b>{formatDate(rfq.deadline)}</b></span></div><h2>{rfq.product_name}</h2><p className="detail-description">{rfq.description}</p><div className="info-grid"><Info label="Quantity" value={rfq.quantity} /><Info label="Delivery location" value={rfq.delivery_location} /></div></section><section className="panel"><div className="panel-head"><div><h3>Submit quotation</h3><p>Provide a clear commercial response.</p></div></div>{error&&<div className="alert error">{error}</div>}<form onSubmit={submit} className="form-grid"><Field label="Quoted price (₹)"><input required type="number" min="0" step="0.01" value={form.quoted_price} onChange={e=>setForm({...form,quoted_price:e.target.value})} placeholder="250000" /></Field><Field label="Estimated delivery (days)"><input required type="number" min="1" value={form.estimated_delivery_days} onChange={e=>setForm({...form,estimated_delivery_days:e.target.value})} placeholder="7" /></Field><Field label="Message / notes"><textarea rows="6" value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Include lead-time, warranty, commercial notes or assumptions." /></Field><button className="primary full" disabled={saving||rfq.status!=='OPEN'}>{saving?'Submitting…':rfq.status!=='OPEN'?'RFQ closed':'Submit quotation'}</button></form></section></div></Layout>
}

function SupplierQuotations() {
  const [quotes,setQuotes]=useState([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('')
  useEffect(()=>{(async()=>{try{setQuotes(await listSupplierQuotations())}catch(e){setError(e.message)}finally{setLoading(false)}})()},[])
  return <Layout user={currentUser()} onLogout={()=>location.reload()}><PageTitle title="My quotations" subtitle="Track the quotations you have submitted." />{error&&<div className="alert error">{error}</div>}{loading?<Loading/>:quotes.length?<div className="quote-table">{quotes.map(q=><div className="panel quote-row" key={q.id}><div><span className="eyebrow">RFQ</span><h3>{q.rfq?.product_name||`RFQ #${q.rfq_id}`}</h3><span className="muted">{q.rfq?.delivery_location||''}</span></div><div><span className="eyebrow">PRICE</span><strong>₹{Number(q.quoted_price).toLocaleString('en-IN')}</strong></div><div><span className="eyebrow">DELIVERY</span><b>{q.estimated_delivery_days} days</b></div><div><span className="eyebrow">SUBMITTED</span><span>{formatDate(q.created_at)}</span></div></div>)}</div>:<div className="panel"><Empty title="No quotations submitted" body="Open an RFQ and submit your first supplier quotation." /></div>}</Layout>
}

function Info({label,value}){return <div className="info"><span>{label}</span><b>{value}</b></div>}
function formatDate(date){if(!date)return '—';return new Date(date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
function todayPlusOne(){const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)}

export default function App(){const[user,setUser]=useState(currentUser());const home=useMemo(()=>user?(user.role==='BUYER'?'/buyer':'/supplier'):'/login',[user]);return <Routes><Route path="/" element={<Navigate to={home} replace/>}/><Route path="/login" element={<AuthPage mode="login" onAuth={setUser}/>}/><Route path="/register" element={<AuthPage mode="register" onAuth={setUser}/>}/><Route path="/buyer" element={<Protected role="BUYER"><BuyerDashboard/></Protected>}/><Route path="/buyer/rfqs/new" element={<Protected role="BUYER"><RFQForm/></Protected>}/><Route path="/buyer/rfqs/:id" element={<Protected role="BUYER"><BuyerRFQDetails/></Protected>}/><Route path="/buyer/rfqs/:id/edit" element={<Protected role="BUYER"><RFQForm edit/></Protected>}/><Route path="/supplier" element={<Protected role="SUPPLIER"><SupplierDashboard/></Protected>}/><Route path="/supplier/rfqs/:id" element={<Protected role="SUPPLIER"><SupplierRFQDetails/></Protected>}/><Route path="/supplier/quotations" element={<Protected role="SUPPLIER"><SupplierQuotations/></Protected>}/><Route path="*" element={<Navigate to={home} replace/>}/></Routes>}
