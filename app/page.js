'use client'
import Image from 'next/image';
import {useState, useEffect} from 'react'
import {firestore} from '@/firebase'
import { Box, Button, Modal, Stack, TextField, Typography } from '@mui/material';
import { collection, getDocs, query, setDoc } from 'firebase/firestore';

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState('');

  /**
   * Asynchronously updates the local inventory by fetching data from Firestore.
   * This function retrieves all documents from the 'inventory' collection, constructs 
   * an inventory list from the documents, and updates the local state variable with 
   * the new inventory information.
   *
   * @returns {Promise<void>} - A promise that resolves when the inventory update is complete.
   */
  const updateInventory = async () => {
    // Query the 'inventory' collection in Firestore
    const snapshot = query(collection(firestore, 'inventory'));
    
    // Fetch the documents matching the query
    const docs = await getDocs(snapshot);
    
    // Initialize an empty array to hold the inventory items
    const inventoryList = [];

    // Iterate over each document in the query results
    docs.forEach((doc) => {
        // Push an object representing each inventory item into the list
        inventoryList.push({
            name: doc.id,        // Use the document ID as the item name
            ...doc.data(),       // Spread the document's data to include additional item details
        });
    });

    // Update the local state variable with the newly created inventory list
    setInventory(inventoryList);
  };

  /**
   * Removes an item from the inventory. If the item's quantity is greater than 1, it decreases the quantity by 1.
   * If the quantity is 1, it deletes the item from the inventory.
   *
   * @param {string} item - The ID of the item to remove from the inventory.
   * @returns {Promise<void>} - A promise that resolves when the operation is complete.
   */
  const removeItem = async (item) => {
    // Get a reference to the document in the 'inventory' collection with the specified item ID
    const docRef = doc(collection(firestore, 'inventory'), item);
    
    // Fetch the document snapshot
    const docSnap = await getDoc(docRef);

    // Check if the document exists in the collection
    if (docSnap.exists()) {
        // Extract the 'quantity' field from the document data
        const { quantity } = docSnap.data();
        
        // If the quantity is 1, delete the document from the collection
        if (quantity === 1) {
            await deleteDoc(docRef);
        } else {
            // Otherwise, decrement the quantity by 1 and update the document
            await setDoc(docRef, { quantity: quantity - 1 });
        }
    }

    // Call the function to update the inventory (assumed to be defined elsewhere)
    await updateInventory();
  };

  /**
   * Adds an item from the inventory. If the item's quantity is greater than 1, it increments the quantity by 1.
   * If the quantity is 0, it create the item in the inventory.
   *
   * @param {string} item - The ID of the item to remove from the inventory.
   * @returns {Promise<void>} - A promise that resolves when the operation is complete.
   */
  const addItem = async (item) => {
    // Get a reference to the document in the 'inventory' collection with the specified item ID
    const docRef = doc(collection(firestore, 'inventory'), item);
    
    // Fetch the document snapshot
    const docSnap = await getDoc(docRef);

    // Check if the document exists in the collection
    if (docSnap.exists()) {
      // Extract the 'quantity' field from the document data
      const { quantity } = docSnap.data();
      await setDoc(docRef, { quantity: quantity + 1 });
    } else {
      // Set the 'quantity' field to 1
      await setDoc(docRef, {quantity: 1})
    }

    // Call the function to update the inventory (assumed to be defined elsewhere)
    await updateInventory();
  };
  
  // Only runs once when the page is loaded. In other words,
  // it only updates the inventory if the page is loaded or refreshed.
  useEffect(() => {
    updateInventory()
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <Box 
      width='100vw' 
      height='100vh' 
      display='flex'
      flexDirection='column'
      justifyContent='center' 
      alignItems='center' 
      gap={2}
    >
      <Modal open={open} onClose={handleClose}>
        <Box 
          position='absolute' 
          top='50%' 
          left='50%'
          width={400} 
          bgcolor='white'
          boxShadow={24}
          p={4}
          display='flex'
          flexDirection='column'
          gap={3}
          sx={{
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Typography variant='h6'>Add Item</Typography>
          <Stack width='100%' direction='row' spacing={3}>
            <TextField 
              variant='outlined'
              fullWidth
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value);
              }}
            />
            <Button variant='outlined' onClick={() => {
              addItem(itemName);
            }}>Add</Button>
          </Stack>
        </Box>
      </Modal>
      <Typography variant='h1'>Inventory Management</Typography>
      <Button variant='contained' onClick={() => {
        handleOpen();
      }}>Add New Item</Button>
    </Box>
  );
}
