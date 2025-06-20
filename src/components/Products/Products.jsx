import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Coffee, Package, Search, X, Eye, ZoomIn } from 'lucide-react';
import {
  subscribeToProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  updateInventory,
  subscribeToInventory
} from '../../services/firestore';
import Modal from '../Common/Modal';
import LoadingSpinner from '../Common/LoadingSpinner';
import DeleteConfirmation from '../Common/DeleteConfirmation';
import './Products.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [totalActiveSlots, setTotalActiveSlots] = useState(0);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Mobile Navigation States
  const [activeTab, setActiveTab] = useState('overview'); // overview, add-product, edit-product
  const [isMobile, setIsMobile] = useState(false);

  // Form refs
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

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const unsubscribeProducts = subscribeToProducts((productsData) => {
      setProducts(productsData);
      setFilteredProducts(productsData);
      setLoading(false);
    });

    const unsubscribeInventory = subscribeToInventory((inventoryData) => {
      const activeSlots = inventoryData.filter(item => {
        return item.productId && !item.isArchivedSlot;
      }).length;
      setTotalActiveSlots(activeSlots);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeInventory();
    };
  }, []);

  // Search functionality
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = products.filter(product => {
      const searchFields = [
        product.name,
        product.sku,
        product.category,
        product.slot
      ].filter(Boolean).map(field => field.toString().toLowerCase());

      return searchFields.some(field => field.includes(searchLower));
    });

    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  // Mobile navigation tabs
  const navigationTabs = [
    { id: 'overview', label: 'Overview', icon: Package },
    { id: 'add-product', label: 'Add Product', icon: Plus },
    { id: 'edit-product', label: 'Edit Product', icon: Edit }
  ];

  const handleViewImage = (product) => {
    setSelectedImage({
      url: product.image,
      name: product.name,
      sku: product.sku
    });
    setShowImageModal(true);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
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
    if (isMobile) {
      setEditingProduct(null);
      setActiveTab('add-product');
      resetForm();
    } else {
      // Desktop: Use modal
      setEditingProduct(null);
      setShowModal(true);
      resetForm();
    }
  };

  const handleEditProduct = (product) => {
    if (isMobile) {
      setEditingProduct(product);
      setActiveTab('edit-product');
      populateForm(product);
    } else {
      // Desktop: Use modal
      setEditingProduct(product);
      setShowModal(true);
      populateForm(product);
    }
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
            quantity: 0
          };

          await updateInventory(formData.slot.trim(), inventoryData);
        } catch (inventoryError) {
          console.warn('Could not update inventory slot:', inventoryError);
        }
      }

      if (isMobile) {
        // Mobile: Go back to overview and reset form
        setActiveTab('overview');
        resetForm();
        setEditingProduct(null);
        alert(`Product ${editingProduct ? 'updated' : 'added'} successfully!`);
      } else {
        // Desktop: Close modal
        setShowModal(false);
        setEditingProduct(null);
      }
      
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

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'add-product':
        return renderProductForm(false);
      case 'edit-product':
        return renderProductForm(true);
      default:
        return renderOverviewTab();
    }
  };

  const renderOverviewTab = () => (
    <>
      {/* Search Bar */}
      <div className="search-container" style={{ 
        marginBottom: '24px',
        position: 'relative',
        maxWidth: '400px'
      }}>
        <div className="search-input-wrapper" style={{ position: 'relative' }}>
          <Search 
            size={20} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#718096',
              pointerEvents: 'none'
            }} 
          />
          <input
            type="text"
            placeholder="Search products by name, SKU, category, or slot..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="form-input"
            style={{ 
              paddingLeft: '40px',
              paddingRight: searchTerm ? '40px' : '12px'
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#718096',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#4a5568'}
              onMouseLeave={(e) => e.target.style.color = '#718096'}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {searchTerm && (
          <div style={{ 
            fontSize: '12px', 
            color: '#718096', 
            marginTop: '4px',
            paddingLeft: '40px'
          }}>
            {filteredProducts.length > 0 
              ? `Found ${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`
              : 'No products found'
            }
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="products-grid">
        {filteredProducts.map((product) => (
          <div key={product.id} className="product-card">
            <div className="product-card-header">
              <div className="product-slot">
                <span>{product.slot}</span>
              </div>
              
              {/* Enhanced action buttons with view image option */}
              <div className="product-actions">
                {product.image && (
                  <button 
                    className="action-btn view-image"
                    onClick={() => handleViewImage(product)}
                    title="View Image"
                  >
                    <Eye size={16} />
                  </button>
                )}
                {!isMobile && (
                  <button 
                    className="action-btn edit"
                    onClick={() => handleEditProduct(product)}
                    title="Edit Product"
                  >
                    <Edit size={16} />
                  </button>
                )}
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
              <div 
                className="product-image"
                style={{ cursor: product.image ? 'pointer' : 'default' }}
                onClick={() => product.image && handleViewImage(product)}
              >
                {product.image ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <img src={product.image} alt={product.name} />
                    <div 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s ease',
                        borderRadius: '8px'
                      }}
                      className="image-overlay"
                    >
                      <ZoomIn size={24} color="white" />
                    </div>
                  </div>
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

              {/* Mobile: Add edit button in card body */}
              {isMobile && (
                <div style={{ marginTop: '12px', padding: '12px 0', borderTop: '1px solid #e2e8f0' }}>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleEditProduct(product)}
                    style={{ width: '100%', fontSize: '14px' }}
                  >
                    <Edit size={16} />
                    Edit Product
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* No Results States */}
      {filteredProducts.length === 0 && searchTerm && (
        <div className="no-products">
          <Search size={48} />
          <h3>No products found</h3>
          <p>No products match "{searchTerm}". Try a different search term.</p>
          <button className="btn btn-secondary" onClick={clearSearch}>
            <X size={16} />
            Clear Search
          </button>
        </div>
      )}

      {products.length === 0 && !searchTerm && (
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
    </>
  );

  const renderProductForm = (isEdit) => (
    <div className="product-form-tab-content" style={{ padding: '20px 0' }}>
      <div style={{ 
        background: '#f7fafc', 
        padding: '20px', 
        borderRadius: '12px', 
        marginBottom: '24px',
        borderLeft: '4px solid #667eea'
      }}>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          color: '#2d3748', 
          fontSize: '18px', 
          fontWeight: '600' 
        }}>
          {isEdit ? 'Edit Product' : 'Add New Product'}
        </h4>
        <p style={{ 
          margin: '0', 
          color: '#4a5568', 
          fontSize: '14px', 
          lineHeight: '1.5' 
        }}>
          {isEdit 
            ? 'Update the product information below. Changes will be saved to the catalog and inventory.'
            : 'Enter the product information below. A new inventory slot will be created automatically.'
          }
        </p>
      </div>

      <form onSubmit={handleFormSubmit} className="product-form">
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
          <small className="form-help">Add an image URL to display the product image</small>
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

        <div style={{ 
          marginTop: '24px', 
          padding: '20px 0', 
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '12px',
          flexDirection: 'column'
        }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ width: '100%', minHeight: '48px', fontSize: '16px' }}
          >
            {saving ? (
              <div className="btn-loading-content">
                <div className="spinner small" style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid rgba(255,255,255,0.3)', 
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span>Saving...</span>
              </div>
            ) : (
              <>
                {isEdit ? <Edit size={16} /> : <Plus size={16} />}
                <span>{isEdit ? 'Update Product' : 'Add Product'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setActiveTab('overview');
              resetForm();
              setEditingProduct(null);
            }}
            disabled={saving}
            style={{ width: '100%', minHeight: '48px', fontSize: '16px' }}
          >
            <Package size={16} />
            Back to Products
          </button>
        </div>
      </form>
    </div>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="products">
      <div className="products-header">
        <div>
          <h1>Product Management</h1>
          <p>Manage your vending machine product catalog</p>
          
          <div className="machine-capacity-info">
            <span><strong>{totalActiveSlots}</strong> active slots</span>
            {searchTerm && (
              <span style={{ color: '#667eea' }}>
                Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products
              </span>
            )}
          </div>
        </div>
        
        {/* Desktop Actions - Show only on desktop */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handleAddProduct}>
              <Plus size={16} />
              Add Product
            </button>
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      {isMobile && (
        <div className="mobile-inventory-navigation">
          <div className="mobile-nav-tabs">
            {navigationTabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  className={`mobile-nav-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <IconComponent size={20} />
                  <span className="mobile-nav-label">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="products-content">
        {isMobile ? renderTabContent() : renderOverviewTab()}
      </div>

      {/* Desktop Modal - Only show on desktop */}
      {!isMobile && showModal && (
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
              <small className="form-help">Add an image URL to display the product image</small>
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

      {/* Streamlined Image Viewer Modal */}
      {showImageModal && selectedImage && (
        <Modal
          title={`${selectedImage.name}${selectedImage.sku ? ` - ${selectedImage.sku}` : ''}`}
          onClose={() => setShowImageModal(false)}
          size="large"
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 0'
          }}>
            <div className="image-viewer-container">
              <img 
                src={selectedImage.url} 
                alt={selectedImage.name}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="image-viewer-error">
                Failed to load image
              </div>
            </div>
            
            <div className="image-viewer-footer">
              <a 
                href={selectedImage.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Open Original
              </a>
            </div>
          </div>
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