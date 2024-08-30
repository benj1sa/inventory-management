'use client';
import { useState, useEffect, useRef } from 'react';
import { firestore, storage } from '@/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { v4 } from 'uuid';
import { Alert, Box, Button, CircularProgress, Container, Fab, FormControlLabel, FormGroup, Grid, Icon, IconButton, Input, InputAdornment, Modal, Paper, Snackbar, Stack, Switch, TextField, Typography } from '@mui/material';
import { collection, getDocs, query, setDoc, getDoc, doc, deleteDoc } from 'firebase/firestore';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { RemoveCircleOutlineOutlined } from '@mui/icons-material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { Camera } from 'react-camera-pro';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

export default function Home() {
  const [inventory, setInventory] = useState([]);
  
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [latestUpdateType, setLatestUpdateType] = useState('Added');
  
  const [itemName, setItemName] = useState('');
  const [itemChangeQuantity, setItemChangeQuantity] = useState(1);
  const [selectedName, setSelectedName] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const [searchValue, setSearchValue] = useState('');
  const [error, setError] = useState(false);
  const [fieldError, setFieldError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageUpload, setImageUpload] = useState(null);
  const camera = useRef(null);

  // ================================================ Helper Functions ================================================ //

  /**
   * This function handles the search event.
   */
  const handleSearchChange = (e) => {
    setSearchValue(e.target.value.toLowerCase());
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

    // Call the function to update the inventory 
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

    // Update local inventory
    await updateInventory();
  };

  const setItem = async (item, deltaQuantity) => {
    
    // Throw an error if the item name field is empty
    if (item.trim() == ''){
      setError(true);
      return;
    } else {
      setError(false);
      console.log('NO ERROR');
    }

    // Get a reference to the document in the 'inventory' collection
    const docRef = doc(collection(firestore, 'inventory'), item.trim().toLocaleLowerCase());
    console.log(docRef);
    // Fetch a snapshot of the document
    const docSnap = await getDoc(docRef);
    console.log(docSnap);
    // The item's new quantity will be the change in quantity, 
    // this may be updated later if the item exists
    let newQuantity = Number(deltaQuantity);
    console.log(deltaQuantity);

    // Calculate the new item quantity
    if (docSnap.exists()) {
      setLatestUpdateType('Updated');
      const { quantity } = docSnap.data();
      newQuantity += quantity;
    } else {
      setLatestUpdateType('Added');
    }

    // Update firebase with the correct quantity of item
    if (newQuantity < 0) {
      await deleteDoc(docRef);
    } else {
      await setDoc(docRef, {quantity: newQuantity});
    }
    
    // Update the local inventory
    await updateInventory();
  };

  // Handle taking a photo with the camera
  const handleCapture = async (dataUri) => {
    setImage(dataUri);
    setCameraOpen(false);
  }

  const uploadImage = () => {
    if (imageUpload == null) return;
    const imageRef = ref(storage, `images/${imageUpload.name + v4()}`);
    uploadBytes(imageRef, imageUpload).then(() =>{
       alert('Uploaded Image!');
    });
    setImageUpload(null);
  };

  // Only runs once when the page is loaded. In other words,
  // it only updates the local displayed inventory if the page is loaded or refreshed.
  useEffect(() => {
    updateInventory();
  }, []);

  const editItem = (itemName, itemChangeQuantity) => {
    setItem(itemName, itemChangeQuantity);
    uploadImage();
    handleEditModalClose();
    handleSnackbarOpen();
  };

  // const addItem = (itemName, itemChangeQuantity) => {
  //   if (itemChangeQuantity < 0) {
  //     // Throw error here, quantity can't be negative
  //     return;
  //   }
  //   setItemChangeQuantity(1);
  //   setItem(itemName, itemChangeQuantity);
  //   uploadImage();
  //   handleAddModalClose();
  //   handleSnackbarOpen();
  // };

  // The opening and clsoing functions for the 'camera' modal
  const handleCameraOpen = () => setCameraOpen(true);
  const handleCameraClose = () => setCameraOpen(false);

  // The opening and closing functions for the 'successfully added items' snackbar
  const handleSnackbarOpen = () => setSnackbarOpen(true);
  const handleSnackBarClose = () => setSnackbarOpen(false);

  // The opening and closing functions for the 'add items' modal
  const handleAddModalOpen = () => setAddModalOpen(true);
  const handleAddModalClose = () => setAddModalOpen(false);

  // The opening and closing functions for the 'edit items' modal
  const handleEditModalOpen = (name, quantity) => {
    setSelectedName(name);
    setSelectedQuantity(quantity);
    setEditModalOpen(true);
  };
  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setFieldError(false);
  }

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
            aspectratio={'1/1'}
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
        <Modal open={addModalOpen} onClose={handleAddModalClose}>
          <Stack
            display={'flex'}
            flexDirection={'column'}
            position={'absolute' }
            top={'50%'}
            left={'50%'}
            width={'70%'}
            maxWidth={'500px'}
            bgcolor={'white'}
            boxShadow={24}
            p={3}
            borderRadius={4}
            gap={3}
            sx={{
              transform: 'translate(-50%, -50%)',
            }}
            spacing={0.1}
          >
            {/* Add item header with discard and add buttons */}
            <>
            <Stack 
              direction={'row'}
              justifyContent={'space-between'}
              p={2}
              borderRadius={2}
              border={'1px solid #ededed'}
              bgcolor={'white'}
              sx={{
                boxShadow: 1
              }}
            >
              <Typography variant='h5' sx={{fontWeight: 'bold'}}>Add Item</Typography>
              <Stack direction={'row'} spacing={1}>
                <Button
                  variant='outlined'
                  color='error'
                  onClick={() => {
                    handleAddModalClose();
                  }}
                >
                  Discard
                </Button>
                <Button 
                  variant='contained'
                  color='primary' 
                  onClick={() => addItem(itemName, itemChangeQuantity)}
                >
                  Add
                </Button>
              </Stack>
            </Stack>
            </>
            
            {/* Item information segment */}
            <>
            <Stack
              direction={'column'} 
              spacing={2}
              p={2}
              borderRadius={2}
              border={'1px solid #ededed'}
              sx={{
                boxShadow: 1
              }}
            >
              <Typography variant={'h7'} m={2} mb={0} sx={{fontWeight: 'bold'}}>Item Information</Typography>
              <TextField
                variant='outlined'
                label='Item Name'
                size='small'
                onChange={(e) => {
                  setItemName(e.target.value);
                }}
                error={error}
                helperText={error ? 'This field cannot be empty' : ''}
                sx={{
                  color: 'white',
                  '& .MuiFormHelperText-root': {
                    color: error ? 'red' : 'inherit',
                  }
                }}
              />
              <TextField
                variant='outlined'
                label='Quantity'
                type='number'
                size='small'
                defaultValue={'1'}
                onChange={(e) => {
                  setItemChangeQuantity(e.target.value);
                }}
              />
            </Stack>
            </>

            {/* Item media segment */}
            <>
            <Stack
              display={'flex'}
              justifyContent={'center'}
              borderRadius={2}
              border={'1px solid #ededed'}
              sx={{
                boxShadow: 1
              }}
            >
              <Typography variant={'h7'} m={2} mb={0} sx={{fontWeight: 'bold'}}>Item Media</Typography>
              <Box display={'flex'} justifyContent={'center'}>
                <Box
                  component="img"
                  aspectratio='1/1'
                  width={'45%'}
                  src={'placeholder.png'}
                  bgcolor={'#f4f4f4'}
                  borderRadius={4}
                />
              </Box>
              <Stack
                display={'flex'}
                direction={'row'}
                justifyContent={'space-around'}
                alignItems={'center'}
                m={2}
              >
                <Button
                  component={'label'}
                  role={undefined}
                  variant={'outlined'}
                  tabIndex={-1}
                  startIcon={<AddPhotoAlternateIcon />}
                >
                  From Library
                  <input 
                    type={'file'}
                    hidden
                    onChange={(e) => {
                      setImageUpload(e.target.files[0]);
                    }}  
                  />
                </Button>
                <Button
                  component="label"
                  role={undefined}
                  variant="outlined"
                  tabIndex={-1}
                  startIcon={<PhotoCameraIcon />}
                  onClick={() => {
                    handleCameraOpen();
                  }}
                >
                  Take Photo
                </Button>
              </Stack>
            </Stack>
            </>
          </Stack>
        </Modal>

        {/* Edit Item Modal */}
        <Modal open={editModalOpen} onClose={handleEditModalClose}>
          <Stack
            display={'flex'}
            flexDirection={'column'}
            position={'absolute' }
            top={'50%'}
            left={'50%'}
            width={'70%'}
            maxWidth={'500px'}
            bgcolor={'white'}
            boxShadow={24}
            p={3}
            borderRadius={4}
            gap={3}
            sx={{
              transform: 'translate(-50%, -50%)',
            }}
            spacing={0.1}
          >
            {/* Add item header with discard and add buttons */}
            <>
            <Stack 
              direction={'row'}
              justifyContent={'space-between'}
              p={2}
              borderRadius={2}
              border={'1px solid #ededed'}
              bgcolor={'white'}
              sx={{
                boxShadow: 1
              }}
            >
              <Typography variant='h5' sx={{fontWeight: 'bold'}}>Edit Item</Typography>
              <Stack direction={'row'} spacing={1}>
                <Button
                  variant='outlined'
                  color='error'
                  onClick={() => {
                    handleEditModalClose();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant='contained'
                  color='primary' 
                  onClick={() => {
                    setItem(itemName, itemChangeQuantity);
                    handleEditModalClose();
                    setLatestUpdateType('Updated');
                    handleSnackbarOpen();
                  }}
                >
                  Update
                </Button>
              </Stack>
            </Stack>
            </>
            
            {/* Item information segment */}
            <>
            <Stack
              direction={'column'} 
              spacing={2}
              p={2}
              borderRadius={2}
              border={'1px solid #ededed'}
              sx={{
                boxShadow: 1
              }}
            >
              <Typography variant={'h7'} m={2} mb={0} sx={{fontWeight: 'bold'}}>Item Information</Typography>
              <TextField
                variant='outlined'
                label='Item Name'
                size='small'
                defaultValue={selectedName}
                onChange={(e) => {
                  setItemName(e.target.value);
                }}
                error={error}
                helperText={error ? 'This field cannot be empty' : ''}
                sx={{
                  color: 'white',
                  '& .MuiFormHelperText-root': {
                    color: error ? 'red' : 'inherit',
                  }
                }}
              />
              <TextField
                variant='outlined'
                label='Quantity'
                type='number'
                size='small'
                defaultValue={selectedQuantity}
                onChange={(e) => {
                  setItemChangeQuantity(e.target.value);
                }}
              />
            </Stack>
            </>

            {/* Item media segment */}
            <>
            <Stack
              display={'flex'}
              justifyContent={'center'}
              borderRadius={2}
              border={'1px solid #ededed'}
              sx={{
                boxShadow: 1
              }}
            >
              <Typography variant={'h7'} m={2} mb={0} sx={{fontWeight: 'bold'}}>Item Media</Typography>
              <Stack
                display={'flex'}
                direction={'row'}
                justifyContent={'space-around'}
                alignItems={'center'}
                m={2}
              >
                <Button
                  component="label"
                  role={undefined}
                  variant="outlined"
                  tabIndex={-1}
                  startIcon={<AddPhotoAlternateIcon />}
                >
                  From Library
                  <input type='file' hidden/>
                </Button>
                <Button
                  component="label"
                  role={undefined}
                  variant="outlined"
                  tabIndex={-1}
                  startIcon={<PhotoCameraIcon />}
                  onClick={() => {
                    handleCameraOpen();
                  }}
                >
                  Take Photo
                </Button>
              </Stack>
            </Stack>
            </>
          </Stack>
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
            <Fab
              color={'primary'}
              onClick={() => {
                handleAddModalOpen();
              }}
            >
              <AddOutlinedIcon />
            </Fab>
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

          {/* Inventory Items */}
          <Container
            width={'100%'}
            border={1}
            margintop={'2'}
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
                  key={name}
                >
                  <Stack
                    bgcolor={'#ffffff'}
                    alignItems={'start'}
                    spacing={0.7}
                    p={2}
                    borderRadius={4}
                    sx={{
                      aspectratio: '1/1',
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
                      aspectratio='1/1'
                      width={'100%'}
                      alt='item image'
                      src='placeholder.png'
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
                      <Stack direction={'row'} spacing={0.75} alignItems={'center'}>
                        <IconButton
                          size='small'
                          color='primary'
                          onClick={() => {removeItem(name)}}
                        >
                          <RemoveCircleOutlineOutlined fontSize='inherit'/>
                        </IconButton>
                        <Typography 
                          variant='p' 
                          color='#333' 
                          textAlign='center'
                          sx={{
                            fontWeight: 'bold'
                          }}
                        >
                          {quantity}
                        </Typography>
                        <IconButton
                          size='small'
                          color='primary'
                          onClick={() => {addItem(name)}}
                        >
                          <AddCircleOutlineOutlinedIcon fontSize='inherit'/>
                        </IconButton>
                      </Stack>

                      <Box>

                        <IconButton
                          size='small'
                          color='primary'
                          onClick={() => {handleEditModalOpen(name, quantity)}}
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
        
        {/* Added item successfullynconfirmation */}
        <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackBarClose}>
          <Alert
            onClose={handleSnackBarClose}
            severity='success'
            sx={{ width: '100%' }}
          >
            {latestUpdateType} Item!
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
}
