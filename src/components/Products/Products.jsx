import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Coffee, Package } from 'lucide-react';
import {
  subscribeToProducts,
  addProduct,
  updateProduct,
  deleteProduct
} from '../../services/firestore';
import Modal from '../Common/Modal';
import LoadingSpinner from '../Common/LoadingSpinner';
import './Products.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'beverages',
    slot: '',
    image: '',
    active: true
  });
  const [saving, setSaving] = useState(false);

  const categories = [
    'beverages',
    'snacks',
    'candy',
    'healthy',
    'other'
  ];

  const availableSlots = [
    'A1', 'A2', 'A3',
    'B1', 'B2', 'B3',
    'C1', 'C2', 'C3',
    'D1', 'D2', 'D3'
  ];

  useEffect(() => {
    const unsubscribe = subscribeToProducts((productsData) => {
      setProducts(productsData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      category: 'beverages',
      slot: '',
      image: '',
      active: true
    });
    setShowModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      price: product.price || '',
      category: product.category || 'beverages',
      slot: product.slot || '',
      image: product.image || '',
      active: product.active !== undefined ? product.active : true
    });
    setShowModal(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(productId);
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product. Please try again.');
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.slot) {
      alert('Please fill in all required fields');
      return;
    }

    // Check if slot is already taken by another product
    const slotTaken = products.some(p => 
      p.slot === formData.slot && 
      (!editingProduct || p.id !== editingProduct.id)
    );

    if (slotTaken) {
      alert('This slot is already taken by another product');
      return;
    }

    setSaving(true);
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price)
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await addProduct(productData);
      }

      setShowModal(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount);
  };

  const getUsedSlots = () => {
    return products.map(p => p.slot).filter(Boolean);
  };

  const getAvailableSlots = () => {
    const usedSlots = getUsedSlots();
    return availableSlots.filter(slot => 
      !usedSlots.includes(slot) || 
      (editingProduct && editingProduct.slot === slot)
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="products">
      <div className="products-header">
        <div>
          <h1>Product Management</h1>
          <p>Manage your vending machine product catalog</p>
        </div>
        <button className="btn btn-primary" onClick={handleAddProduct}>
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Products Grid */}
      <div className="products-grid">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <div className="product-card-header">
              <div className="product-slot">
                <span>{product.slot}</span>
              </div>
              <div className="product-actions">
                <button 
                  className="action-btn edit"
                  onClick={() => handleEditProduct(product)}
                  title="Edit Product"
                >
                  <Edit size={16} />
                </button>
                <button 
                  className="action-btn delete"
                  onClick={() => handleDeleteProduct(product.id)}
                  title="Delete Product"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="product-card-body">
              <div className="product-image">
                {product.image ? (
                  <img src={product.image} alt={product.name} />
                ) : (
                  <div className="product-placeholder">
                    <Coffee size={32} />
                  </div>
                )}
              </div>

              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <div className="product-price">
                  {formatCurrency(product.price)}
                </div>
                <div className="product-details">
                  <span className="product-category">
                    {product.category || 'Other'}
                  </span>
                  <span className={`product-status ${product.active ? 'active' : 'inactive'}`}>
                    {product.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="no-products">
          <Package size={48} />
          <h3>No products yet</h3>
          <p>Add your first product to get started</p>
          <button className="btn btn-primary" onClick={handleAddProduct}>
            <Plus size={16} />
            Add Product
          </button>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showModal && (
        <Modal
          title={editingProduct ? 'Edit Product' : 'Add New Product'}
          onClose={() => setShowModal(false)}
          size="medium"
        >
          <form onSubmit={handleFormSubmit} className="product-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Product Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., Coca Cola"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="price" className="form-label">
                  Price (NZD) *
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="2.50"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category" className="form-label">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="slot" className="form-label">
                  Slot Position *
                </label>
                <select
                  id="slot"
                  name="slot"
                  value={formData.slot}
                  onChange={handleInputChange}
                  className="form-select"
                  required
                >
                  <option value="">Select slot</option>
                  {getAvailableSlots().map(slot => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="image" className="form-label">
                Image URL
              </label>
              <input
                type="url"
                id="image"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
                className="form-input"
                placeholder="https://example.com/product-image.jpg"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                />
                <span className="checkmark"></span>
                Active (available for purchase)
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? <LoadingSpinner size="small" /> : (editingProduct ? 'Update' : 'Add')} Product
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Products;