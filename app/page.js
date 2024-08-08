'use client';
import { Image } from 'next/image';
import { useState, useEffect } from 'react';
import { firestore } from '@/firebase';
import { Box, Button, FormControlLabel, FormGroup, Icon, IconButton, InputAdornment, Modal, Stack, Switch, TextField, Typography } from '@mui/material';
import { collection, getDocs, query, setDoc, getDoc, doc, deleteDoc } from 'firebase/firestore';
import { SearchIcon } from '@mui/material';
//import theme from './theme.js';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material';
//import { lightTheme, darkTheme } from './theme.js';
import RemoveCircleRoundedIcon from '@mui/icons-material/RemoveCircleRounded';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
// import { dark } from '@mui/material/styles/createPalette.js';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [foundInventory, setFoundInventory] = useState(inventory);
  const [error, setError] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ================================================ Helper Functions ================================================ //

  /**
   * This function handles the dark mode event
   */
  const handleThemechange = (event) => {
    setIsDarkMode(newTheme);
  }

  /**
   * This function handles the search event.
   */
  const handleSearchChange = (event) => {
    setSearchValue(event.target.value.toLowerCase());
  }

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

    // The item field may not be empty, otherwise set the error state variable to be true
    if (item.trim() == ''){
      setError(true);
      return;
    } else {
      setError(false);
    }

    // Get a reference to the document in the 'inventory' collection with the specified item ID
    const docRef = doc(collection(firestore, 'inventory'), item.trim().toLocaleLowerCase());
    
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
  // it only updates the local displayed inventory if the page is loaded or refreshed.
  useEffect(() => {
    updateInventory();
  }, []);

  // The opening and closing functions for the 'add items' modal
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // ================================================ Main Body ================================================ //

  return (
    <ThemeProvider theme={darkTheme}>
    
    <Box 
      width='100vw' 
      height='100vh' 
      display='flex'
      flexDirection='column'
      justifyContent='center' 
      alignItems='center' 
      gap={2}
      sx={{
        fontFamily: 'Poppins, sans-serif',
      }}
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
          borderRadius={4}
          gap={3}
          sx={{
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Typography variant='h6'>Add Item</Typography>
          <Stack width='100%' direction='row' spacing={3}>
            <TextField 
              variant='outlined'
              placeholder='Item'
              fullWidth
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value);
              }}
              error={error}
              helperText={error ? 'This field cannot be empty' : ''}
              sx={{
                '& .MuiFormHelperText-root': {
                  color: error ? 'red' : 'inherit',
                }
              }}
            />
            <Button 
              variant='outlined' 
              onClick={() => {
                addItem(itemName);
                setItemName('');
              }}
            >
              Add
            </Button>
          </Stack>
        </Box>
      </Modal>
      
      <Stack
        padding={6}
        boxShadow={3}
        borderRadius={4}
        spacing={2}
      >
        <Box
          width='800px'
          height='100px'
          display='flex'
          flexDirection='row'
          alignItems='center' 
          justifyContent='space-between'
          borderRadius={4}
        >
          <Typography variant='h2' color='#333'>Inventory Items</Typography>
          <IconButton
            onClick={handleThemechange}
            size='large'
          >
            <LightModeIcon fontSize='inherit' />
          </IconButton>
        </Box>

        <TextField
          variant="outlined"
          placeholder="Search"
          value={searchValue}
          onChange={handleSearchChange}
          fullWidth
        />
      
        <Stack width='800px' height='350px' spacing={2} overflow='auto' display='flex' alignItems='center'>
          {inventory.filter((item) => {
            return (searchValue === '')? item : item.name.toLocaleLowerCase().includes(searchValue);
          }).map(({name, quantity}) => (
            <Box 
              key={name}
              width='95%'
              minHeight='150px'
              display='flex'
              alignItems='center'
              justifyContent='space-between'
              bgcolor='#f0f0f0'
              padding={5}
              borderRadius={4}
              sx={{
                transition: 'transform 0.3s ease', // Smooth transition for the transform property
                '&:hover': {
                  transform: 'scale(1.02)', // Slightly increase the size
                },
              }}
            >
              <Typography variant='h3' color='#333' textAlign='center'>
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </Typography>
              <Typography variant='h3' color='#333' textAlign='center'>
                {'x' + quantity}
              </Typography>
              <Stack direction='row' spacing={1}>
                <IconButton
                  size='large'
                  color='primary'
                  onClick={() => {addItem(name)}}
                >
                  <AddCircleRoundedIcon fontSize='inherit'/>
                </IconButton>
                <IconButton
                  size='large'
                  color='primary'
                  onClick={() => {removeItem(name)}}
                >
                  <RemoveCircleRoundedIcon fontSize='inherit'/>
                </IconButton>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>

      <Button 
        variant='contained'
        endIcon={<AddCircleRoundedIcon />}
        onClick={() => {
          handleOpen();
        }}
      >
        Add New Item
      </Button>
    </Box>
    </ThemeProvider>
  );
}
