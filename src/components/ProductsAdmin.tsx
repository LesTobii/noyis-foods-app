import React, { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { useApp } from '../context/AppContext'

interface Flavor {
  name: string
  price: number
}

interface Product {
  id: string
  name: string
  flavors: Flavor[]
}

const ProductsAdmin: React.FC = () => {
  const { pushToast, pushConfirm } = useApp()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // New product form
  const [newProductName, setNewProductName] = useState('')
  
  // New flavor form
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [newFlavorName, setNewFlavorName] = useState('')
  const [newFlavorPrice, setNewFlavorPrice] = useState('')

  // Edit mode state
  const [editingKey, setEditingKey] = useState<string | null>(null) // "productId-flavorIndex"
  const [editPrice, setEditPrice] = useState<string>('')

  // Default products to seed on first load
  const DEFAULT_PRODUCTS: Product[] = [
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

  // Load products from Firestore
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
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
      
      console.log('Loaded products:', productsData)
      
      // If catalog is empty, seed with defaults
      if (productsData.length === 0) {
        console.log('Catalog empty, seeding with default products...')
        await seedDefaultProducts()
      } else {
        setProducts(productsData)
      }
    } catch (error) {
      console.error('Error loading products:', error)
      setError(`Failed to load products: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const seedDefaultProducts = async () => {
    try {
      for (const product of DEFAULT_PRODUCTS) {
        await setDoc(doc(db, 'catalog', product.id), {
          name: product.name,
          flavors: product.flavors
        })
      }
      console.log('Default products seeded successfully')
      setProducts(DEFAULT_PRODUCTS)
    } catch (error) {
      console.error('Error seeding default products:', error)
      setError('Failed to initialize default products')
    }
  }

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProductName.trim()) {
      pushToast('Please enter a product name', 'error')
      return
    }

    try {
      const productId = newProductName.toLowerCase().replace(/\s+/g, '_')
      
      await setDoc(doc(db, 'catalog', productId), {
        name: newProductName,
        flavors: []
      })
      
      setNewProductName('')
      await loadProducts()
      pushToast('Product created! Now add flavors to it.', 'success')
    } catch (error) {
      console.error('Error adding product:', error)
      pushToast('Failed to add product', 'error')
    }
  }

  const deleteProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId)
    
    pushConfirm(
      `Delete "${product?.name}" and all ${product?.flavors.length || 0} flavor(s)? This cannot be undone.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'catalog', productId))
          await loadProducts()
          pushToast(`"${product?.name}" deleted successfully`, 'success')
        } catch (error) {
          console.error('Error deleting product:', error)
          pushToast('Failed to delete product', 'error')
        }
      },
      () => {
        pushToast('Delete cancelled', 'info')
      }
    )
  }

  const addFlavor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductId || !newFlavorName.trim() || !newFlavorPrice) {
      pushToast('Please select a product and fill in all fields', 'error')
      return
    }

    try {
      const product = products.find(p => p.id === selectedProductId)
      if (!product) return

      const updatedFlavors: Flavor[] = [
        ...product.flavors,
        { name: newFlavorName, price: parseFloat(newFlavorPrice) }
      ]

      await updateDoc(doc(db, 'catalog', selectedProductId), {
        flavors: updatedFlavors
      })

      setNewFlavorName('')
      setNewFlavorPrice('')
      await loadProducts()
      pushToast('Flavor added!', 'success')
    } catch (error) {
      console.error('Error adding flavor:', error)
      pushToast('Failed to add flavor', 'error')
    }
  }

  const updateFlavorPrice = async (productId: string, flavorIndex: number, newPrice: string) => {
    // Validate price
    if (!newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) <= 0) {
      setError('Price must be a positive number')
      return
    }

    try {
      const product = products.find(p => p.id === productId)
      if (!product) return

      const updatedFlavors = [...product.flavors]
      updatedFlavors[flavorIndex].price = parseFloat(newPrice)

      // Update Firestore
      await updateDoc(doc(db, 'catalog', productId), {
        flavors: updatedFlavors
      })

      // Update local state after successful save
      const updatedProducts = products.map(p => 
        p.id === productId ? { ...p, flavors: updatedFlavors } : p
      )
      setProducts(updatedProducts)
      setEditingKey(null)
      setEditPrice('')
      setError(null)
      pushToast('Price updated', 'success')
    } catch (error) {
      console.error('Error updating flavor price:', error)
      setError('Failed to update price')
      pushToast('Failed to update price', 'error')
    }
  }

  const deleteFlavor = async (productId: string, flavorIndex: number) => {
    const product = products.find(p => p.id === productId)
    const flavor = product?.flavors[flavorIndex]
    
    pushConfirm(
      `Delete flavor "${flavor?.name}"? This cannot be undone.`,
      async () => {
        try {
          if (!product) return
          const updatedFlavors = product.flavors.filter((_, i) => i !== flavorIndex)

          await updateDoc(doc(db, 'catalog', productId), {
            flavors: updatedFlavors
          })

          await loadProducts()
          pushToast(`"${flavor?.name}" deleted`, 'success')
        } catch (error) {
          console.error('Error deleting flavor:', error)
          pushToast('Failed to delete flavor', 'error')
        }
      },
      () => {
        pushToast('Delete cancelled', 'info')
      }
    )
  }

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Loading products...</div>
  }

  return (
    <div className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Product & Flavor Management</h2>
        <p style={{ margin: '8px 0 0 0', fontSize: 13, color: '#6b7280' }}>
          Products are categories. Flavors are what you sell with prices.
        </p>
      </div>

      {error && (
        <div style={{ padding: 12, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Add new product */}
      <section style={{ marginBottom: 32, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
        <h3 style={{ marginTop: 0, fontSize: 16, fontWeight: 700 }}>Create New Product (Category)</h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0 }}>
          Example: "Yoghurt", "Smoothie", "Ice Cream"
        </p>
        <form onSubmit={addProduct} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Product name (e.g., Yoghurt)"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            className="input"
            style={{ flex: 1, minWidth: 200 }}
          />
          <button type="submit" className="btn primary-cta">
            Create Product
          </button>
        </form>
      </section>

      {/* Add new flavor */}
      <section style={{ marginBottom: 32, padding: 16, background: '#fef7f0', borderRadius: 8 }}>
        <h3 style={{ marginTop: 0, fontSize: 16, fontWeight: 700 }}>Add Flavor to Product</h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0 }}>
          Example: Add "Greek", "Strawberry Blend", "Plain" to Yoghurt
        </p>
        {products.length === 0 && (
          <div style={{ padding: 12, background: '#fee2e2', borderRadius: 6, marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
            ⚠️ No products yet. Create a product above first.
          </div>
        )}
        <form onSubmit={addFlavor} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="input"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Flavor Name</label>
            <input
              type="text"
              placeholder="e.g., Greek"
              value={newFlavorName}
              onChange={(e) => setNewFlavorName(e.target.value)}
              className="input"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 0.8, minWidth: 120 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Price (₦)</label>
            <input
              type="number"
              placeholder="e.g., 950"
              value={newFlavorPrice}
              onChange={(e) => setNewFlavorPrice(e.target.value)}
              className="input"
            />
          </div>
          <button type="submit" className="btn primary-cta">
            Add Flavor
          </button>
        </form>
      </section>

      {/* Products list */}
      <section>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 16 }}>Products & Flavors</h3>
        {products.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
            No products yet. Create one above!
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {products.map((product) => (
              <div
                key={product.id}
                style={{
                  padding: 16,
                  border: '1px solid #e6e9ef',
                  borderRadius: 8,
                  background: '#fbfff9'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 24, borderRadius: 3, background: 'var(--emerald)' }}></div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{product.name}</h4>
                  </div>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="btn-small danger"
                  >
                    Delete Product
                  </button>
                </div>

                {/* Flavors list */}
                {product.flavors.length > 0 ? (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e6f2ff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                      <div style={{ width: 4, height: 16, borderRadius: 2, background: 'var(--orange)' }}></div>
                      <span>Flavors:</span>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {product.flavors.map((flavor, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #e6f2ff' }}>
                          <span style={{ flex: 1, fontWeight: 600 }}>{flavor.name}</span>
                          {editingKey === `${product.id}-${idx}` ? (
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <span style={{ color: '#6b7280' }}>₦</span>
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                autoFocus
                                style={{ width: 80, padding: 6, borderRadius: 4, border: '2px solid var(--emerald)', fontSize: 13 }}
                              />
                              <button
                                onClick={() => updateFlavorPrice(product.id, idx, editPrice)}
                                className="btn-small"
                                style={{ padding: '4px 8px', fontSize: 12, background: 'var(--emerald)', color: '#fff', border: 'none', cursor: 'pointer' }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingKey(null); setEditPrice(''); setError(null) }}
                                className="btn-small"
                                style={{ padding: '4px 8px', fontSize: 12, background: '#94a3b8', color: '#fff', border: 'none', cursor: 'pointer' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <span style={{ color: '#6b7280' }}>₦</span>
                              <span style={{ width: 80, textAlign: 'center', fontWeight: 600 }}>{flavor.price.toLocaleString()}</span>
                              <button
                                onClick={() => { setEditingKey(`${product.id}-${idx}`); setEditPrice(flavor.price.toString()) }}
                                className="btn-small"
                                style={{ padding: '4px 8px', fontSize: 12, background: 'var(--orange)', color: '#fff', border: 'none', cursor: 'pointer' }}
                              >
                                Edit
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => deleteFlavor(product.id, idx)}
                            className="btn-small danger"
                            style={{ padding: '4px 8px', fontSize: 12 }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, padding: 12, background: '#fee2e2', borderRadius: 6, fontSize: 13, color: '#dc2626' }}>
                    ⚠️ No flavors yet. Add at least one flavor above, or use the product name if there are no variants.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default ProductsAdmin
