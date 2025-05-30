import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

export const useFirestore = (collectionName, orderField = null) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let q;
    
    if (orderField) {
      q = query(collection(db, collectionName), orderBy(orderField));
    } else {
      q = collection(db, collectionName);
    }

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const documents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(documents);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, orderField]);

  return { data, loading, error };
};