import React, { useState, useMemo, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { db } from '../lib/firebase'
import { collection, getDocs } from 'firebase/firestore'

interface Flavor {
  name: string
  price: number
}

interface Product {
  id: string
  name: string
  flavors: Flavor[]
}

// Fallback products if Firestore is down
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'yoghurt',
    name: 'Yoghurt',
    flavors: [
      { name: 'Plain', price: 850 },
      { name: 'Strawberry', price: 950 },
      { name: 'Mango', price: 970 }
    ]
  },
  {
    id: 'ice_cream',
    name: 'Ice Cream',
    flavors: [
      { name: 'Vanilla', price: 1200 },
      { name: 'Chocolate', price: 1350 },
      { name: 'Caramel', price: 1380 }
    ]
  },
  {
    id: 'snack_pack',
    name: 'Snack Pack',
    flavors: [
      { name: 'Spicy', price: 730 },
      { name: 'Salted', price: 650 },
      { name: 'Sweet', price: 680 }
    ]
  }
]

// Payment modes
const PAYMENT_MODES = ['POS', 'Transfer', 'Cash']

const SalesForm: React.FC = () => {
  const { addSale, updateSale, editingSale, setEditingSale, pushToast } = useApp()

  // Load products from Firestore
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS)
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const catalogCollection = collection(db, 'catalog')
      const snapshot = await getDocs(catalogCollection)
      const productsData: Product[] = []
      
      snapshot.forEach(doc => {
        const data = doc.data() as any
        productsData.push({
          id: doc.id,
          name: data.name || '',
          flavors: data.flavors || []
        })
      })
      
      if (productsData.length > 0) {
        setProducts(productsData)
      }
    } catch (error) {
      console.error('Error loading products from Firestore:', error)
      // Use fallback products
    } finally {
      setLoadingProducts(false)
    }
  }

  // Form state
  const [product, setProduct] = useState<string>('')
  const [flavor, setFlavor] = useState<string>('')
  const [unit, setUnit] = useState<number>(0)
  const [paymentMode, setPaymentMode] = useState<string>('')
  const [submitted, setSubmitted] = useState(false)

  // Validation errors
  const errors: Record<string, string> = {}
  if (!product) errors.product = 'Product required'
  if (!flavor) errors.flavor = 'Flavor required'
  if (unit < 1) errors.unit = 'Unit must be at least 1'
  if (!paymentMode) errors.paymentMode = 'Payment mode required'

  // Auto price calculation - get from the selected flavor's direct price
  const price = useMemo(() => {
    const selectedProduct = products.find(p => p.id === product || p.name === product)
    if (!selectedProduct) return 0
    const selectedFlavor = selectedProduct.flavors.find(f => f.name === flavor)
    return selectedFlavor?.price || 0
  }, [product, flavor, products])

  // Auto total
  const total = useMemo(() => price * unit, [price, unit])

  // Form is valid when no errors
  const isValid = Object.keys(errors).length === 0

  // Update flavors when product changes
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProduct = e.target.value
    setProduct(newProduct)
    // Reset flavor to first available
    const selectedProduct = products.find(p => p.id === newProduct || p.name === newProduct)
    const firstFlavor = selectedProduct?.flavors[0]?.name
    if (firstFlavor) setFlavor(firstFlavor)
  }

  // Submit: save to localStorage (mock) and show success
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)

    if (!isValid) return
    if (editingSale && editingSale.id) {
      // update
      updateSale(editingSale.id, { product, flavor, unit, price, total, paymentMode, date: editingSale.date, time: editingSale.time })
        .then(() => {
          pushToast('Sale updated', 'success')
          setEditingSale(null)
        })
        .catch(() => pushToast('Failed to update', 'error'))
    } else {
      // Call the app context save function
      addSale({ product, flavor, unit, price, total, paymentMode })
      pushToast('Sale recorded', 'success')
    }

    // Reset form
    setProduct('')
    setFlavor('')
    setUnit(0)
    setPaymentMode('')
    setSubmitted(false)
  }

  // When editingSale changes, populate the form fields
  useEffect(() => {
    if (editingSale) {
      setProduct(editingSale.product || '')
      setFlavor(editingSale.flavor || '')
      setUnit(Number(editingSale.unit || 0))
    } else {
      // reset to empty when not editing
      setProduct('')
      setFlavor('')
      setUnit(0)
      setPaymentMode('')
    }
  }, [editingSale])
  return (
    // Centered, constrained form container (~500px) per specification
    <div className="card" style={{display:'flex',justifyContent:'center'}}>
      <form className="form-container" style={{maxWidth:500,width:'100%'}} onSubmit={handleSubmit}>
        {/* Title */}
        <div style={{textAlign:'center',marginBottom:12}}>
          <h2 style={{margin:0,fontSize:22,fontWeight:800}}>{editingSale ? 'Edit Sale' : 'New Sales Record'}</h2>
        </div>

        {/* Thin divider */}
        <hr className="form-divider" />

        {/* Stacked input fields with generous spacing */}
        <div className="form-stack">
          {/* Product */}
          <div className="form-item">
            <label className="form-label">Product</label>
            <select
              className={`input glow ${submitted && errors.product ? 'error' : ''}`}
              value={product}
              onChange={handleProductChange}
              aria-label="Product"
            >
              <option value="">Select product</option>
              {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            {submitted && errors.product ? <span className="error-text">{errors.product}</span> : null}
          </div>

          {/* Flavor */}
          <div className="form-item">
            <label className="form-label">Flavor</label>
            <select
              className={`input glow ${submitted && errors.flavor ? 'error' : ''}`}
              value={flavor}
              onChange={e => setFlavor(e.target.value)}
              aria-label="Flavor"
            >
              <option value="">Select flavor</option>
              {product && products.find(p => p.name === product) ? 
                products.find(p => p.name === product)!.flavors.map(f => <option key={f.name} value={f.name}>{f.name}</option>) 
                : null}
            </select>
            {submitted && errors.flavor ? <span className="error-text">{errors.flavor}</span> : null}
          </div>

          {/* Unit */}
          <div className="form-item">
            <label className="form-label">Unit Quantity</label>
            <input
              className={`input glow ${submitted && errors.unit ? 'error' : ''}`}
              type="text"
              inputMode="numeric"
              value={unit || ''}
              onChange={e => {
                const val = e.target.value
                // Only allow digits
                if (val === '') {
                  setUnit(0)
                } else if (/^\d+$/.test(val)) {
                  setUnit(parseInt(val, 10))
                }
              }}
              aria-label="Unit Quantity"
            />
            {submitted && errors.unit ? <span className="error-text">{errors.unit}</span> : null}
          </div>

          {/* Payment Mode */}
          <div className="form-item">
            <label className="form-label">Payment Mode</label>
            <select
              className={`input glow ${submitted && errors.paymentMode ? 'error' : ''}`}
              value={paymentMode}
              onChange={e => setPaymentMode(e.target.value)}
              aria-label="Payment Mode"
            >
              <option value="">Select payment</option>
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {submitted && errors.paymentMode ? <span className="error-text">{errors.paymentMode}</span> : null}
          </div>
        </div>

        {/* Summary area: two smaller columns (read-only calculated fields) */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
          <div style={{background:'#f9fafb', padding:10, borderRadius:8}}>
            <div style={{fontSize:11, color:'#6b7280', marginBottom:4}}>Unit Price (₦)</div>
            <input style={{background:'#fff', border:'1px solid #e6e9ef', padding:6, borderRadius:6, width:'100%', fontSize:13, fontWeight:700}} readOnly value={price} />
          </div>
          <div style={{background:'#f9fafb', padding:10, borderRadius:8}}>
            <div style={{fontSize:11, color:'#6b7280', marginBottom:4}}>Total Amount (₦)</div>
            <input style={{background:'#fff', border:'1px solid #e6e9ef', padding:6, borderRadius:6, width:'100%', fontSize:13, fontWeight:700}} readOnly value={total} />
          </div>
        </div>

        {/* Full-width action button - disabled until valid */}
        <div style={{marginTop:18,display:'flex',gap:8}}>
          <button type="submit" className={`btn primary-cta full-width ${!isValid ? 'disabled' : ''}`} disabled={!isValid}>{editingSale ? 'Update Sale' : 'Record Sale'}</button>
          {editingSale ? (
            <button type="button" className="btn-ghost" onClick={() => { setEditingSale(null); pushToast('Edit cancelled', 'info') }}>Cancel</button>
          ) : null}
        </div>
      </form>
    </div>
  )
}

export default SalesForm
