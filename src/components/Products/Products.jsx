import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Coffee, Package } from 'lucide-react';
import {
  subscribeToProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  updateInventory,
  getMachineCapacity
} from '../../services/firestore';
import Modal from '../Common/Modal';
import LoadingSpinner from '../Common/LoadingSpinner';
import DeleteConfirmation from '../Common/DeleteConfirmation';
import './Products.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [machineCapacity, setMachineCapacity] = useState({
    totalSlots: 0,
    maxSlotNumber: 0,
    occupiedSlots: 0,
    availableSlots: 0
  });
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
  const slotRef = useRef(); // Now for custom slot input

  const imageRef = useRef();
  const activeRef = useRef();

  const categories = [
    'beverages',
    'snacks',
    'candy',
    'healthy',
    'other'
  ];

  useEffect(() => {
    const unsubscribe = subscribeToProducts((productsData) => {
      setProducts(productsData);
      setLoading(false);
    });

    // Load capacity info
    loadMachineCapacity();

    return unsubscribe;
  }, []);

  const loadMachineCapacity = async () => {
    try {
      const capacity = await getMachineCapacity();
      setMachineCapacity(capacity);
    } catch (error) {
      console.error('Error loading machine capacity:', error);
    }
  };

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
      quantity: '0',
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
    if (!formData.slot.trim()) {
      errors.slot = 'Slot name is required';
    }

    const price = parseFloat(formData.price);
    if (formData.price && (isNaN(price) || price <= 0)) {
      errors.price = 'Price must be a positive number';
    }

    const maxCapacity = parseInt(formData.maxCapacity);
    if (formData.maxCapacity && (isNaN(maxCapacity) || maxCapacity < 1 || maxCapacity > 100)) {
      errors.maxCapacity = 'Max capacity must be between 1 and 100';
    }

    // Check if slot name is already taken
    if (formData.slot.trim()) {
      const slotTaken = products.some(p => 
        p.slot && p.slot.toLowerCase() === formData.slot.trim().toLowerCase() && 
        (!editingProduct || p.id !== editingProduct.id)
      );
      if (slotTaken) {
        errors.slot = 'This slot name is already taken by another product';
      }
    }

    // Check if SKU is already taken
    if (formData.sku.trim()) {
      const skuTaken = products.some(p => 
        p.sku && p.sku.toLowerCase() === formData.sku.trim().toLowerCase() && 
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
      // Reload capacity after deletion
      await loadMachineCapacity();
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
        slot: formData.slot.trim(),
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

          // Create/update inventory slot
      if (formData.slot.trim()) {
        try {
          const inventoryData = {
            productId: productId,
            maxCapacity: parseInt(formData.maxCapacity) || 20,
            lowStockThreshold: 5,
            quantity: 0 // Always start with 0 quantity
          };

          await updateInventory(formData.slot.trim(), inventoryData);
        } catch (inventoryError) {
          console.warn('Could not update inventory slot:', inventoryError);
        }
      }

      setShowModal(false);
      setEditingProduct(null);
      setValidationErrors({});
      
      // Reload capacity after adding/updating product
      await loadMachineCapacity();
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="products">
      <div className="products-header">
        <div>
          <h1>Product Management</h1>
          <p>Manage your vending machine product catalog</p>
          
          {/* Machine Capacity Info */}
          <div className="machine-capacity-info" style={{ 
            marginTop: '12px', 
            padding: '12px', 
            background: '#f7fafc', 
            borderRadius: '8px',
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
            fontSize: '14px',
            color: '#4a5568'
          }}>
            <span><strong>{machineCapacity.totalSlots}</strong> total slots</span>
            <span><strong>{machineCapacity.occupiedSlots}</strong> occupied</span>
            <span><strong>{machineCapacity.availableSlots}</strong> available</span>
            <span style={{ color: '#718096' }}>
              Unlimited slot creation
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={handleAddProduct}>
            <Plus size={16} />
            Add Product
          </button>
        </div>
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

      {/* Product Form Modal */}
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
                  max="100"
                  onChange={() => handleInputChange('maxCapacity')}
                />
                <small className="form-help">Maximum items this slot can hold (1-100)</small>
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
                  Slot Name *
                </label>
                <input
                  type="text"
                  id="slot"
                  ref={slotRef}
                  className={`form-input ${validationErrors.slot ? 'error' : ''}`}
                  placeholder="e.g., Slot A1, Cold Drinks 1, etc."
                  onChange={() => handleInputChange('slot')}
                  required
                />
                <small className="form-help">Enter any custom slot name you want</small>
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