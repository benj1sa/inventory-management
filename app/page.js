'use client';
import { useState, useEffect, useRef } from 'react';
import { firestore } from '@/firebase';
import { Alert, Box, Button, CircularProgress, Container, Fab, FormControlLabel, FormGroup, Grid, Icon, IconButton, InputAdornment, Modal, Paper, Snackbar, Stack, Switch, TextField, Typography } from '@mui/material';
import { collection, getDocs, query, setDoc, getDoc, doc, deleteDoc } from 'firebase/firestore';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { RemoveCircleOutlineOutlined } from '@mui/icons-material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { Camera } from 'react-camera-pro';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState(null);
  const camera = useRef(null);

  // ================================================ Helper Functions ================================================ //

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
    setLoading(false);
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

  // Handle taking a photo with the camera
  const handleCapture = async (dataUri) => {
    setImage(dataUri);
    setCameraOpen(false);
  }

  // Only runs once when the page is loaded. In other words,
  // it only updates the local displayed inventory if the page is loaded or refreshed.
  useEffect(() => {
    updateInventory();
  }, []);

  // The opening and clsoing functions for the 'camera' modal
  const handleCameraOpen = () => setCameraOpen(true);
  const handleCameraClose = () => setCameraOpen(false);

  // The opening and closing functions for the 'successfully added items' snackbar
  const handleSnackbarOpen = () => setSnackbarOpen(true);
  const handleSnackBarClose = () => setSnackbarOpen(false);

  // The opening and closing functions for the 'add items' modal
  const handleModalOpen = () => setModalOpen(true);
  const handleModalClose = () => setModalOpen(false);

  // ================================================ Main Body ================================================ //

  return (
    <>
      {/* Grand container */}
      <Box
        display={'flex'}
        justifyContent={'center'}
        sx={{
          bgcolor: '#f4f4f4',
          paddingTop: '20px',
          height: '100vh',
          width: '100vw',
          margin: '0px',
          marginRight: '0px',
        }}
      >
        {/* Camera Modal */}
        <Modal open={cameraOpen} onClose={handleCameraClose}>
          <Box
            display={'flex'}
            flexDirection={'column'}
            position={'absolute' }
            top={'50%'}
            left={'50%'}
            bgcolor={'white'}
            width={'400px'}
            height={'400px'}
            aspectRatio={'1/1'}
            boxShadow={24}
            p={4}
            borderRadius={4}
            gap={3}
            sx={{
              transform: 'translate(-50%, -50%)',
            }}
          >
            <Box>
              <Camera
                onCapture={handleCapture}
                onClose={handleCameraClose}
              />
            </Box>
            <Typography>Test</Typography>
          </Box>
        </Modal>

        {/* Add Item Modal */}
        <Modal open={modalOpen} onClose={handleModalClose}>
          <Box
            display={'flex'}
            flexDirection={'column'}
            position={'absolute' }
            top={'50%'}
            left={'50%'}
            width={'400px'} 
            bgcolor={'white'}
            boxShadow={24}
            p={4}
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
                  handleModalClose();
                  handleSnackbarOpen();
                }}
              >
                Add
              </Button>
            </Stack>
          </Box>
        </Modal>
      
        {/* Main Iventory App */}
        <Container maxWidth={'md'} >
          
          {/* Inventory and Add button */}
          <>
          <Box
            display={'flex'}
            flexDirection={'row'}
            alignItems={'center'} 
            justifyContent={'space-between'}
          >
            <Typography variant={'h3'} color={'#333'} sx={{fontWeight:'bold'}}>Inventory</Typography>
            <Stack direction={'row'} spacing={2}>
              <Fab
                color={'primary'}
                onClick={() => {
                  handleCameraOpen();
                }}
              >
                <PhotoCameraIcon />
              </Fab>
              <Fab
                color={'primary'}
                onClick={() => {
                  handleModalOpen();
                }}
              >
                <AddOutlinedIcon />
              </Fab>
            </Stack>
          </Box>
          </>

          {/* Search field */}
          <>
          <TextField
            variant={'outlined'}
            placeholder={'Search'}
            InputProps={{
              startAdornment: (
                <InputAdornment position={'start'}>
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchValue}
            onChange={handleSearchChange}
            fullWidth
            sx={{
              marginTop: '20px',
              bgcolor: '#ffffff',
            }}
          />
          </>

          {/* Loading Icon */}
          <>
          <Box 
            display={'flex'} 
            flexDirection={'row'} 
            justifyContent={'center'} 
            margin={2}
          >
            {loading? <CircularProgress />: <></>}
          </Box>
          </>

          {/* Iventory Items */}
          <Container
            width={'100%'}
            border={1}
            marginTop={'2'}
          >
            <Grid
              container
              direction={'row'}
              justifyContent={'flex-start'}
              spacing={{
                xs: 2,
                sm: 2,
                md: 2,
                lg: 2,
              }}

              //border={1}
              maxHeight={'70vh'}
              overflow={'auto'}
              paddingRight={2.2}

              sx={{
                // Scroll-bar styling for Webkit browsers
                '&::-webkit-scrollbar': {
                  width: '6px'
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#888', // Color of the thumb
                  borderRadius: '6px' // Rounded corners for the thumb
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent' // Hide the track
                },
                // Scroll-bar styling for Firefox (Gecko)
                scrollbarWidth: 'thin',
                scrollbarColor: '#888 transparent'
              }}
            >
              {inventory.filter((item) => {
                return (searchValue === '')? item : item.name.toLocaleLowerCase().includes(searchValue);
              }).map(({name, quantity}) => (
                
                <Grid 
                  item
                  xs={6}
                  sm={4}
                  // md={4}
                  // lg={4}
                  // xl={4}
                  key={name}
                >
                  <Stack
                    bgcolor={'#ffffff'}
                    alignItems={'start'}
                    spacing={0.7}
                    p={2}
                    borderRadius={4}
                    sx={{
                      aspectRatio: '1/1',
                      boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px',
                      transition: 'transform 0.3s ease', // Smooth transition for the transform property
                      '&:hover': {
                        transform: 'scale(1.02)', // Slightly increase the size
                      },
                    }}
                  >
                    {/* Image */}
                    <Box
                      component="img"
                      aspectRatio='1/1'
                      width={'100%'}
                      alt='item image'
                      src='apple.png'
                      bgcolor={'#f4f4f4'}
                      borderRadius={4}
                    />

                    {/* Name of inventory item */}
                    <Typography
                      variant='p' 
                      color='#333' 
                      textAlign='center' 
                      sx={{
                        fontWeight: 'bold'
                      }}
                    >
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                    </Typography>

                    {/* Quantity and modifiers */}
                    <Box
                      display={'flex'}
                      direction={'row'}
                      justifyContent={'space-between'}
                      alignItems={'center'}
                      width={'100%'}
                    >
                      <Typography variant='p' color='#333' textAlign='center'>
                        {'x ' + quantity}
                      </Typography>

                      <Box>
                        <IconButton
                          size='small'
                          color='primary'
                          onClick={() => {addItem(name)}}
                        >
                          <AddCircleOutlineOutlinedIcon fontSize='inherit'/>
                        </IconButton>

                        <IconButton
                          size='small'
                          color='primary'
                          onClick={() => {removeItem(name)}}
                        >
                          <RemoveCircleOutlineOutlined fontSize='inherit'/>
                        </IconButton>

                        <IconButton
                        size='small'
                        color='primary'
                        >
                          <MoreHorizIcon fontSize='inherit'/>
                        </IconButton>
                      </Box>
                    </Box>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Container>
        
        <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackBarClose}>
          <Alert
            onClose={handleSnackBarClose}
            severity='success'
            sx={{ width: '100%' }}
          >
            Added Item!
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
}
