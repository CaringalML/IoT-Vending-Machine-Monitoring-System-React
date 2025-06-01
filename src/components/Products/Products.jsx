import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Coffee, Package } from 'lucide-react';
import {
  subscribeToProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  updateInventory,
  getInventoryBySlot
} from '../../services/firestore';
import Modal from '../Common/Modal';
import LoadingSpinner from '../Common/LoadingSpinner';
import DeleteConfirmation from '../Common/DeleteConfirmation';
import './Products.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Form refs - direct access to input values
  const nameRef = useRef();
  const skuRef = useRef();
  const priceRef = useRef();
  const maxCapacityRef = useRef();
  const categoryRef = useRef();
  const slotRef = useRef();
  const imageRef = useRef();
  const activeRef = useRef();

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

  const resetForm = () => {
    setTimeout(() => {
      if (nameRef.current) nameRef.current.value = '';
      if (skuRef.current) skuRef.current.value = '';
      if (priceRef.current) priceRef.current.value = '';
      if (maxCapacityRef.current) maxCapacityRef.current.value = '20';
      if (categoryRef.current) categoryRef.current.value = 'beverages';
      if (slotRef.current) slotRef.current.value = '';
      if (imageRef.current) imageRef.current.value = '';
      if (activeRef.current) activeRef.current.checked = true;
    }, 0);
    setValidationErrors({});
  };

  const populateForm = (product) => {
    setTimeout(() => {
      if (nameRef.current) nameRef.current.value = product.name || '';
      if (skuRef.current) skuRef.current.value = product.sku || '';
      if (priceRef.current) priceRef.current.value = product.price || '';
      if (maxCapacityRef.current) maxCapacityRef.current.value = product.maxCapacity || '20';
      if (categoryRef.current) categoryRef.current.value = product.category || 'beverages';
      if (slotRef.current) slotRef.current.value = product.slot || '';
      if (imageRef.current) imageRef.current.value = product.image || '';
      if (activeRef.current) activeRef.current.checked = product.active !== undefined ? product.active : true;
    }, 0);
    setValidationErrors({});
  };

  const getCurrentFormData = () => {
    return {
      name: nameRef.current?.value || '',
      sku: skuRef.current?.value || '',
      price: priceRef.current?.value || '',
      maxCapacity: maxCapacityRef.current?.value || '20',
      category: categoryRef.current?.value || 'beverages',
      slot: slotRef.current?.value || '',
      image: imageRef.current?.value || '',
      active: activeRef.current?.checked ?? true
    };
  };

  const validateFormData = (formData) => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    }
    if (!formData.price) {
      errors.price = 'Price is required';
    }
    if (!formData.slot) {
      errors.slot = 'Slot position is required';
    }

    const price = parseFloat(formData.price);
    if (formData.price && (isNaN(price) || price <= 0)) {
      errors.price = 'Price must be a positive number';
    }

    const maxCapacity = parseInt(formData.maxCapacity);
    if (formData.maxCapacity && (isNaN(maxCapacity) || maxCapacity < 1 || maxCapacity > 50)) {
      errors.maxCapacity = 'Max capacity must be between 1 and 50';
    }

    if (formData.slot) {
      const slotTaken = products.some(p => 
        p.slot === formData.slot && 
        (!editingProduct || p.id !== editingProduct.id)
      );
      if (slotTaken) {
        errors.slot = 'This slot is already taken by another product';
      }
    }

    if (formData.sku) {
      const skuTaken = products.some(p => 
        p.sku === formData.sku && 
        (!editingProduct || p.id !== editingProduct.id)
      );
      if (skuTaken) {
        errors.sku = 'This SKU is already taken by another product';
      }
    }

    return errors;
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowModal(true);
    resetForm();
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowModal(true);
    populateForm(product);
  };

  const handleDeleteProduct = (product) => {
    setDeletingProduct(product);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteProduct = async () => {
    if (!deletingProduct) return;

    try {
      await deleteProduct(deletingProduct.id);
      setShowDeleteConfirm(false);
      setDeletingProduct(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Failed to delete product. Please try again.');
    }
  };

  const generateSKU = (category) => {
    const prefix = category.slice(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  };

  const handleInputChange = (fieldName) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    const formData = getCurrentFormData();
    const errors = validateFormData(formData);
    
    // Additional validation for max capacity vs existing stock
    if (editingProduct && formData.slot && formData.maxCapacity) {
      try {
        const existingInventory = await getInventoryBySlot(formData.slot);
        if (existingInventory && existingInventory.quantity > parseInt(formData.maxCapacity)) {
          errors.maxCapacity = `Max capacity cannot be less than current stock (${existingInventory.quantity}). Please reduce stock first or increase max capacity.`;
        }
      } catch (error) {
        console.warn('Could not check existing inventory:', error);
      }
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      const fieldRef = {
        name: nameRef,
        sku: skuRef,
        price: priceRef,
        maxCapacity: maxCapacityRef,
        slot: slotRef
      }[firstErrorField];
      
      if (fieldRef?.current) {
        fieldRef.current.focus();
      }
      return;
    }

    setSaving(true);
    try {
      const productData = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        slot: formData.slot,
        image: formData.image.trim(),
        active: formData.active,
        maxCapacity: parseInt(formData.maxCapacity) || 20,
        sku: formData.sku.trim() || generateSKU(formData.category)
      };

      let productId;
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        productId = editingProduct.id;
      } else {
        productId = await addProduct(productData);
      }

      if (formData.slot) {
        try {
          // Get existing inventory data to preserve quantity
          const existingInventory = await getInventoryBySlot(formData.slot);
          
          const inventoryData = {
            productId: productId,
            maxCapacity: parseInt(formData.maxCapacity) || 20,
            lowStockThreshold: 5
          };

          // Only set quantity to 0 if this is a new product (no existing inventory)
          // Otherwise, preserve the existing quantity
          if (!existingInventory) {
            inventoryData.quantity = 0;
          }

          await updateInventory(formData.slot, inventoryData);
        } catch (inventoryError) {
          console.warn('Could not update inventory slot:', inventoryError);
        }
      }

      setShowModal(false);
      setEditingProduct(null);
      setValidationErrors({});
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product. Please try again.');
    } finally {
      setSaving(false);
    }
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
                  onClick={() => handleDeleteProduct(product)}
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
                
                <div className="product-meta">
                  {product.sku && (
                    <div className="product-sku">
                      <small>SKU: {product.sku}</small>
                    </div>
                  )}
                  <div className="product-capacity">
                    <small>Max Capacity: {product.maxCapacity || 20}</small>
                  </div>
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
                  ref={nameRef}
                  className={`form-input ${validationErrors.name ? 'error' : ''}`}
                  placeholder="e.g., Coca Cola"
                  onChange={() => handleInputChange('name')}
                  required
                />
                {validationErrors.name && (
                  <div className="form-error">{validationErrors.name}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="sku" className="form-label">
                  SKU
                </label>
                <input
                  type="text"
                  id="sku"
                  ref={skuRef}
                  className={`form-input ${validationErrors.sku ? 'error' : ''}`}
                  placeholder="e.g., BEV-001 (auto-generated if empty)"
                  onChange={() => handleInputChange('sku')}
                />
                <small className="form-help">Leave empty to auto-generate</small>
                {validationErrors.sku && (
                  <div className="form-error">{validationErrors.sku}</div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price" className="form-label">
                  Price (NZD) *
                </label>
                <input
                  type="number"
                  id="price"
                  ref={priceRef}
                  className={`form-input ${validationErrors.price ? 'error' : ''}`}
                  placeholder="2.50"
                  step="0.01"
                  min="0"
                  onChange={() => handleInputChange('price')}
                  required
                />
                {validationErrors.price && (
                  <div className="form-error">{validationErrors.price}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="maxCapacity" className="form-label">
                  Max Capacity
                </label>
                <input
                  type="number"
                  id="maxCapacity"
                  ref={maxCapacityRef}
                  className={`form-input ${validationErrors.maxCapacity ? 'error' : ''}`}
                  placeholder="20"
                  min="1"
                  max="50"
                  onChange={() => handleInputChange('maxCapacity')}
                />
                <small className="form-help">Maximum items this slot can hold (1-50)</small>
                {validationErrors.maxCapacity && (
                  <div className="form-error">{validationErrors.maxCapacity}</div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category" className="form-label">
                  Category
                </label>
                <select
                  id="category"
                  ref={categoryRef}
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
                  ref={slotRef}
                  className={`form-select ${validationErrors.slot ? 'error' : ''}`}
                  onChange={() => handleInputChange('slot')}
                  required
                >
                  <option value="">Select slot</option>
                  {getAvailableSlots().map(slot => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                {validationErrors.slot && (
                  <div className="form-error">{validationErrors.slot}</div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="image" className="form-label">
                Image URL
              </label>
              <input
                type="url"
                id="image"
                ref={imageRef}
                className="form-input"
                placeholder="https://example.com/product-image.jpg"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  ref={activeRef}
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
                style={{ minWidth: '140px', height: '44px' }}
              >
                {saving ? (
                  <div className="btn-loading-content">
                    <div className="spinner small" style={{ 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid #e2e8f0', 
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  (editingProduct ? 'Update' : 'Add') + ' Product'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <DeleteConfirmation
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteProduct}
        title="Delete Product"
        message="Are you sure you want to delete this product? This will move it to 'Old Products' in the inventory."
        itemName={deletingProduct?.name}
        type="product"
        warningText="This action cannot be undone. The product will be removed from the catalog and marked as deleted in inventory."
        confirmText="Delete Product"
        showInput={false}
      />
    </div>
  );
};

export default Products;