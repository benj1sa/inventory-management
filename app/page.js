'use client';
import { useState, useEffect, useRef } from 'react';
import { firestore, storage } from '@/firebase';
import { ref, uploadBytes, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 } from 'uuid';
import { Alert, Box, Button, CircularProgress, Container, Fab, FormControlLabel, FormGroup, Grid, Icon, IconButton, Input, InputAdornment, Modal, Paper, Snackbar, Stack, Switch, TextField, Typography } from '@mui/material';
import { collection, getDocs, query, setDoc, getDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { BorderClear, RemoveCircleOutlineOutlined } from '@mui/icons-material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { Camera } from 'react-camera-pro';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';

export default function Home() {

  // Stores the local inventory item names
  const [inventory, setInventory] = useState([]);
  
  // Boolean values for whether the modals should be open or not
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Boolean values for whether other elements should be open or not
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Tracks the latest update types
  const [latestUpdateType, setLatestUpdateType] = useState('Added');
  
  const [selectedItemName, setSelectedItemName] = useState('');
  const [selectedItemQuantity, setSelectedItemQuantity] = useState(1);
  const [selectedItemImageUrl, setSelectedItemImageUrl] = useState('');
  const [itemNameBuffer, setItemNameBuffer] = useState('');
  const [itemQuantityBuffer, setItemQuantityBuffer] = useState(1);
  const [itemImageBuffer, setItemImageBuffer] = useState('');
  const [itemImageBufferPreview, setItemImageBufferPreview] = useState('');

  const [searchValue, setSearchValue] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const camera = useRef(null);

  // ================================================ Helper Functions ================================================ //

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
   * Decrements an item's quantity by 1. If the quantity is 1, it deletes the item from the inventory.
   * Assumes the item is already in the inventory.
   *
   * @param {string} itemName - The name of the item to remove from the inventory.
   * @returns {Promise<void>} - A promise that resolves when the operation is complete.
   */
  const handleDecrementItem = async (itemName) => {
    // Get a reference to the document in the 'inventory' collection with the specified item ID
    const docRef = doc(collection(firestore, 'inventory'), itemName);
    // Fetch the document snapshot
    const docSnap = await getDoc(docRef);

    // Extract the 'quantity' field from the document data
    const { imageUrl, quantity } = docSnap.data();
    // If the quantity is 1, delete the document from the collection. Otherwise, decrement the quantity by 1 and update the document
    await (quantity === 1)? deleteDoc(docRef) : setDoc(docRef, { imageUrl: imageUrl, quantity: Number(quantity) - 1});

    // Update the inventory 
    updateInventory();
  };

  /**
   * Increments an item's quantity by 1. Assumes the item is already in the inventory.
   *
   * @param {string} item - The ID of the item to remove from the inventory.
   * @returns {Promise<void>} - A promise that resolves when the operation is complete.
   */
  const handleIncrementItem = async (itemName) => {
    // Get a reference to the document in the 'inventory' collection with the specified item ID
    const docRef = doc(collection(firestore, 'inventory'), itemName.trim().toLocaleLowerCase());
    // Fetch the document snapshot
    const docSnap = await getDoc(docRef);

    // Extract the 'quantity' field from the document data
    const { imageUrl, quantity } = docSnap.data();
    // Increment the 'quantity' field 
    await setDoc(docRef, { imageUrl: imageUrl, quantity: 1 + Number(quantity) });

    // Update local inventory
    updateInventory();
  };

  /**
   * Adds an item to the inventory with the specified parameters. itemName must not be empty. quantity must
   * not be less than 1.
   * 
   * @param {*} itemName 
   * @param {*} quantity 
   * @param {*} imageUrl 
   * @returns 
   */
  const addItem = async (itemName, quantity, imageUrl) => {
    if (itemName.trim() == '' || quantity <= 0){
      setError(true);
      return;
    }
    // Get a reference to the document in the 'inventory' collection with the specified item name
    const docRef = doc(collection(firestore, 'inventory'), itemName.trim().toLocaleLowerCase());
    await setDoc(docRef, {imageUrl: imageUrl, quantity: quantity});
  }
  
  /**
   * Deletes an item from the inventory.
   * 
   * @param {*} itemName 
   */
  const deleteItem = async (itemName) => {
    // Get a reference to the document in the 'inventory' collection with the specified item name
    const docRef = doc(collection(firestore, 'inventory'), itemName.trim().toLocaleLowerCase());

    const docSnap = await getDoc(docRef);
    const { imageUrl } = docSnap.data();

    // Extract the path from the URL
    const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/inventory-management-690cc.appspot.com/o/';
    const imagePath = imageUrl.replace(baseUrl, '').split('?')[0].replace('%2F', '/');

    // Create a reference to the image
    const imageRef = ref(storage, imagePath);

    // Delete both entries 
    await deleteObject(imageRef);
    await deleteDoc(docRef);
  }

  const updateItem = async (itemName, itemQuantity, imageUrl, newItemName, newItemQuantity, newImageUrl) => {
    if (itemName == newItemName && 
        itemQuantity == newItemQuantity && 
        imageUrl == newImageUrl){
      return;
    }
    if (newItemName.trim() == '' || newItemQuantity <= 0){
      setError(true);
      return;
    }
    await deleteItem(itemName);
    await addItem(newItemName, newItemQuantity, newImageUrl);
  }

  /**
   * Uploads the image buffer state to Firebase Storage. If the state is null, does nothing.
   * 
   * @returns uploaded image URL
   */
  const uploadItemImageBuffer = async () => {
    if (itemImageBuffer == null) return;

    try {
      const imageRef = ref(storage, `images/${itemImageBuffer.name + v4()}`);
      console.log(imageRef);
      await uploadBytes(imageRef, itemImageBuffer);
      const url = await getDownloadURL(imageRef); 
      console.log(url);
      return url;
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  };

  // Handles the search event
  const handleSearchChange = (event) => setSearchValue(event.target.value.toLowerCase());

  // Handles item name buffer changes
  const handleItemNameBufferChange = (event) => setItemNameBuffer(event.target.value);

  // Handles item quantity buffer changes
  const handleItemQuantityBufferChange = (event) => setItemQuantityBuffer(event.target.value);

  // Handles item image buffer changes
  const handleImageBufferChange = (event) => {
    setItemImageBuffer(event.target.files[0]);
    setItemImageBufferPreview(URL.createObjectURL(event.target.files[0]));
  }

  // Handle taking a photo with the camera
  const handleCapture = async (dataUri) => {
    setImage(dataUri);
    setCameraOpen(false);
  }

  // The opening and closing functions for the 'camera' modal
  const handleCameraOpen = () => setCameraOpen(true);
  const handleCameraClose = () => setCameraOpen(false);

  // The opening and closing functions for the 'successfully added items' snackbar
  const handleSnackbarOpen = () => setSnackbarOpen(true);
  const handleSnackBarClose = () => setSnackbarOpen(false);

  // The opening and closing functions for the 'add items' modal
  const handleAddModalOpen = () => setAddModalOpen(true);
  const handleAddModalClose = () => setAddModalOpen(false);

  // The opening and closing functions for the 'edit items' modal
  const handleEditModalOpen = (itemName, quantity, itemImageUrl) => {
    // Update the state of the buffers
    setSelectedItemImageUrl(itemImageUrl);
    setItemNameBuffer(itemName.charAt(0).toUpperCase() + itemName.slice(1));
    setItemQuantityBuffer(quantity);
    // Update the local state of selection
    setItemImageBufferPreview(itemImageUrl);
    setSelectedItemName(itemName.charAt(0).toUpperCase() + itemName.slice(1));
    setSelectedItemQuantity(quantity);
    // Set the modal to be visible
    setEditModalOpen(true);
  };
  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setItemImageBufferPreview('');
  }

  const handleAddNewItem = async () => {
    // Upload image to Firebase Storage and get the image URL
    const itemImageBufferURL = await uploadItemImageBuffer();
    // Call server function to add the new item with the 
    await addItem(itemNameBuffer, itemQuantityBuffer, itemImageBufferURL);
    // Update the local copy of the inventory
    updateInventory();
    // Give user feedback of successful inventory addition
    handleAddModalClose();
    setLatestUpdateType('Added');
    handleSnackbarOpen();
  }

  const handleUpdateItem = async () => {
    const itemImageBufferURL = await uploadItemImageBuffer();
    // Call backend function to update item
    await updateItem(selectedItemName, selectedItemQuantity, selectedItemImageUrl, itemNameBuffer, itemQuantityBuffer, itemImageBufferURL);
    // Update the local copy of the inventory
    updateInventory();
    // Give user feedback of successful inventory update
    handleEditModalClose();
    setLatestUpdateType('Updated');
    handleSnackbarOpen();
  }

  const handleDeleteItem = async () => {
    // Call server function to delete the item
    await deleteItem(selectedItemName);
    // Update the local copy of the inventory
    updateInventory();
    // Give the user feedback of successful inventory removal
    handleEditModalClose();
    setLatestUpdateType('Removed');
    handleSnackbarOpen();
  }

  useEffect(() => {
    // Update the local copy of the inventory
    updateInventory();

    // Manage application lifecycle when closed
    const unloadCallback = () => {firebase.app().delete()}
    window.addEventListener('beforeunload', unloadCallback);
    return async () => {
      window.removeEventListener('beforeunload', unloadCallback);
    }
  }, []);

  // ================================================ Main Body ================================================ //

  return (
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
              {/* <Button
                variant='outlined'
                color='error'
                onClick={handleAddModalClose}
                sx={{ textTransform: 'none' }}
              >
                Discard
              </Button> */}
              <Button 
                variant='contained'
                color='primary' 
                onClick={handleAddNewItem}
                sx={{ textTransform: 'none' }}
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
              onChange={handleItemNameBufferChange}
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
              onChange={handleItemQuantityBufferChange}
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
                component='img'
                aspectratio='1/1'
                width={'45%'}
                src={itemImageBufferPreview || 'placeholder.png'}
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
                variant={'outlined'}
                startIcon={<AddPhotoAlternateIcon />}
                sx={{ textTransform: 'none' }}
              >
                Select Media
                <input 
                  type={'file'}
                  hidden
                  onChange={handleImageBufferChange}  
                />
              </Button>
              {/* <Button
                component='label'
                role={undefined}
                variant='outlined'
                tabIndex={-1}
                startIcon={<PhotoCameraIcon />}
                onClick={handleCameraOpen}
              >
                Take Photo
              </Button> */}
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
          {/* Edit item header with 'cancel' and 'update' buttons */}
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
              {/* <Button
                variant='outlined'
                color='error'
                onClick={() => handleEditModalClose()}
                sx={{ textTransform: 'none' }}
              >
                Cancel
              </Button> */}
              <Button 
                variant='contained'
                color='primary' 
                onClick={() => handleUpdateItem()}
                sx={{ textTransform: 'none' }}
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
              defaultValue={selectedItemName}
              onChange={handleItemNameBufferChange}
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
              defaultValue={selectedItemQuantity}
              onChange={handleItemQuantityBufferChange}
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
            {/* title */}
            <Typography variant={'h7'} m={2} mb={0} sx={{fontWeight: 'bold'}}>Item Image</Typography>
            {/* preview image */}
            <Box display={'flex'} justifyContent={'center'}>
              
              <Box
                component='img'
                maxHeight={'170px'}
                maxWidth={'90%'}
                alt='item image'
                src={itemImageBufferPreview || selectedItemImageUrl || 'placeholder.png'}
                bgcolor={'#f4f4f4'}
                borderRadius={4}
              />
            </Box>
            {/* add photo buttons */}
            <Stack
              display={'flex'}
              direction={'row'}
              justifyContent={'space-around'}
              alignItems={'center'}
              m={2}
            >
              <Button
                component='label'
                variant='outlined'
                startIcon={<AddPhotoAlternateIcon />}
                sx={{ textTransform: 'none' }}
              >
                Select Image
                <input 
                  type='file' 
                  hidden
                  onChange={handleImageBufferChange}
                />
              </Button>
              {/* <Button
                component='label'
                role={undefined}
                variant='outlined'
                tabIndex={-1}
                startIcon={<PhotoCameraIcon />}
                onClick={handleCameraOpen}
              >
                Take Photo
              </Button> */}
            </Stack>
          </Stack>
          </>

          {/* Delete Item */}
          <>
          <Box
            display={'flex'}
            justifyContent={'center'}
          >
            <Button
              component='label'
              color='error'
              variant='outlined'
              startIcon={<DeleteIcon />}
              onClick={handleDeleteItem}
            >
              Delete Item
            </Button>
          </Box>
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
            }).map(({name, quantity, imageUrl}) => (
              
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
                  border={'1px solid #e4e4e4'}
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
                  <Container>
                    <Box
                      display={'flex'}
                      justifyContent={'center'}
                      alignItems={'center'}
                      height={'170px'}
                      width={'100%'}
                      borderRadius={4}
                    >
                      <Box
                        component='img'
                        maxHeight={'170px'}
                        maxWidth={'100%'}
                        alt='item image'
                        src={imageUrl || 'placeholder.png'}
                        bgcolor={'#f4f4f4'}
                        borderRadius={4}
                      />
                    </Box>
                  </Container>
                  
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
                        onClick={() => handleDecrementItem(name)}
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
                        onClick={() => handleIncrementItem(name)}
                      >
                        <AddCircleOutlineOutlinedIcon fontSize='inherit'/>
                      </IconButton>
                    </Stack>
                    <Box>
                      <IconButton
                        size='small'
                        color='primary'
                        onClick={() => handleEditModalOpen(name, quantity, imageUrl)}
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
  );
}