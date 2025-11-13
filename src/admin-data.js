import { db, storage, firebaseConfig } from './firebase.js';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

function ensureDb() {
  if (!db) throw new Error('Database not initialized.');
}

function ensureStorage() {
  if (!storage) throw new Error('Firebase Storage not initialized.');
}

async function deleteProjectImageFromStorage(imageUrl) {
  if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) return;
  ensureStorage();
  try {
    const regex = new RegExp(`artifacts%2F${firebaseConfig.projectId}%2Fpublic%2Fimages%2Fprojects%2F([^?]+)`);
    const match = imageUrl.match(regex);
    if (!match || !match[1]) {
      console.warn(`Could not parse storage path from URL for deletion: ${imageUrl}`);
      return;
    }
    const decodedFilePath = decodeURIComponent(match[1]);
    const imageRef = ref(storage, `artifacts/${firebaseConfig.projectId}/public/images/projects/${decodedFilePath}`);
    await deleteObject(imageRef);
  } catch (error) {
    console.warn(`Failed to delete image from Storage (${imageUrl}): ${error.message}`);
  }
}

export async function addProjectToFirebase(projectData, imageFiles) {
  ensureDb();
  ensureStorage();

  const imageUrls = [];
  for (const imageFile of imageFiles) {
    const uniqueFileName = `${Date.now()}-${imageFile.name}`;
    const imageRef = ref(storage, `artifacts/${firebaseConfig.projectId}/public/images/projects/${uniqueFileName}`);
    const uploadResult = await uploadBytes(imageRef, imageFile);
    const imageUrl = await getDownloadURL(uploadResult.ref);
    imageUrls.push(imageUrl);
  }

  const projectsCollectionRef = collection(db, `artifacts/${firebaseConfig.projectId}/public/data/projects`);
  await addDoc(projectsCollectionRef, {
    title: projectData.title,
    description: projectData.description,
    imageUrls,
    timestamp: serverTimestamp(),
  });
  return true;
}

export async function updateProjectInFirebase(
  projectId,
  projectData,
  imageFiles,
  existingImageUrls = [],
  removedImageUrls = []
) {
  ensureDb();
  ensureStorage();

  const projectDocRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/projects`, projectId);
  let imageUrls = [...(existingImageUrls || [])];

  if (imageFiles.length) {
    for (const imageFile of imageFiles) {
      const uniqueFileName = `${Date.now()}-${imageFile.name}`;
      const imageRef = ref(storage, `artifacts/${firebaseConfig.projectId}/public/images/projects/${uniqueFileName}`);
      const uploadResult = await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(uploadResult.ref);
      imageUrls.push(imageUrl);
    }
  }

  if (removedImageUrls.length) {
    await Promise.all(removedImageUrls.map(deleteProjectImageFromStorage));
  }

  await updateDoc(projectDocRef, {
    title: projectData.title,
    description: projectData.description,
    imageUrls,
  });
  return true;
}

export async function deleteProjectFromFirebase(projectId, imageUrls = []) {
  ensureDb();
  ensureStorage();

  await deleteDoc(doc(db, `artifacts/${firebaseConfig.projectId}/public/data/projects`, projectId));
  await Promise.all((imageUrls || []).map(deleteProjectImageFromStorage));
  return true;
}

export async function loadProjectsForAdmin() {
  ensureDb();
  const projectsCol = collection(db, `artifacts/${firebaseConfig.projectId}/public/data/projects`);
  const snapshot = await getDocs(query(projectsCol));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function loadMessagesForAdmin() {
  ensureDb();
  const messagesCol = collection(db, `artifacts/${firebaseConfig.projectId}/public/data/messages`);
  const snapshot = await getDocs(query(messagesCol));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function deleteMessageFromFirebase(messageId) {
  ensureDb();
  await deleteDoc(doc(db, `artifacts/${firebaseConfig.projectId}/public/data/messages`, messageId));
  return true;
}
