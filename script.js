import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, query, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

async function loadFirebaseConfig() {
    try {
        const response = await fetch('https://gist.githubusercontent.com/leonsaraqini/a2383515540c378376475e23ae97d390/raw/firebase-config.json');
        if (!response.ok) throw new Error(`Failed to fetch config: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error("Error loading Firebase config:", error);
        return null;
    }
}

async function initializeFirebase() {
    const config = await loadFirebaseConfig();
    if (!config) return null;

    try {
        const app = initializeApp(config);
        console.log("✅ Firebase initialized successfully!");
        return getFirestore(app);
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        return null;
    }
}

async function getProjects() {
    const db = await initializeFirebase();
    if (!db) return;

    try {
        const q = query(collection(db, "Project"), orderBy("order")); // Sort by "order" field
        const querySnapshot = await getDocs(q);
        const projectsContainer = document.getElementById("projects");
        projectsContainer.innerHTML = ""; // Clear previous list

        querySnapshot.forEach((docSnap) => {
            const obj = docSnap.data();
            const projectId = docSnap.id;

            // Create list item for drag-and-drop
            const listItem = document.createElement("li");
            listItem.dataset.id = projectId;
            listItem.className = "list-group-item d-flex justify-content-between align-items-center shadow-sm p-3";

            listItem.innerHTML = `
                <div>
                    <h5><a href="${obj.link}" target="_blank">${obj.title}</a></h5>
                    <p><strong>Created With:</strong> ${obj.createdWith}</p>
                    <p class="small">${obj.description}</p>
                </div>
                <button class="btn btn-danger btn-sm" onclick="deleteProject('${projectId}')">🗑 Delete</button>
            `;

            projectsContainer.appendChild(listItem);
        });

        // Enable drag-and-drop sorting
        enableDragAndDrop();

        console.log("✅ Projects loaded successfully!");
    } catch (error) {
        console.error("Error fetching projects:", error);
    }
}

async function addProject(event) {
    event.preventDefault(); // Prevent page reload

    const db = await initializeFirebase();
    if (!db) return;

    const title = document.getElementById("title").value;
    const link = document.getElementById("link").value;
    const createdWith = document.getElementById("createdWith").value;
    const description = document.getElementById("description").value;

    try {
        // Get the highest "order" value
        const projectsRef = collection(db, "Project");
        const q = query(projectsRef, orderBy("order", "desc"));
        const querySnapshot = await getDocs(q);
        
        let maxOrder = 0;
        if (!querySnapshot.empty) {
            maxOrder = querySnapshot.docs[0].data().order;
        }

        // Create project object with order = maxOrder + 1
        const newProject = {
            title,
            link,
            createdWith,
            description,
            order: maxOrder + 1
        };

        await addDoc(projectsRef, newProject);
        console.log("✅ Project added successfully!");

        document.getElementById("projectForm").reset();
        getProjects(); // Refresh project list
    } catch (error) {
        console.error("Error adding project:", error);
    }
}

async function deleteProject(projectId) {
    const db = await initializeFirebase();
    if (!db) return;

    try {
        await deleteDoc(doc(db, "Project", projectId));
        console.log(`✅ Project ${projectId} deleted successfully!`);
        getProjects(); // Refresh project list
    } catch (error) {
        console.error("Error deleting project:", error);
    }
}

// Enable drag-and-drop sorting
function enableDragAndDrop() {
    const projectsContainer = document.getElementById("projects");

    new Sortable(projectsContainer, {
        animation: 150,
        onEnd: async (event) => {
            const db = await initializeFirebase();
            if (!db) return;

            const items = projectsContainer.children;
            const updates = [];

            // Loop through reordered items and update their "order" field
            for (let i = 0; i < items.length; i++) {
                const projectId = items[i].dataset.id;
                updates.push(updateDoc(doc(db, "Project", projectId), { order: i }));
            }

            // Update Firestore
            await Promise.all(updates);
            console.log("✅ Order updated successfully in Firestore!");
        }
    });
}


// Attach event listener to form
document.getElementById("projectForm").addEventListener("submit", addProject);

// Load projects on page load
getProjects();

// Expose delete function globally
window.deleteProject = deleteProject;
