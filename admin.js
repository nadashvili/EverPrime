import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, getDocs, doc, getDoc, deleteDoc, orderBy } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAtQfNnv6qDbnbHzZ-XE8pIylLRYg5UTbg",
    authDomain: "everprime-b80dd.firebaseapp.com",
    projectId: "everprime-b80dd",
    storageBucket: "everprime-b80dd.firebasestorage.app",
    messagingSenderId: "527537324294",
    appId: "1:527537324294:web:de1a4e25057389bc6e9e87"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const u = await getDoc(doc(db, "users", user.uid));
        if(u.exists() && u.data().role === 'admin') {
            loadAdminData();
        } else {
            window.location.href = "index.html";
        }
    } else {
        window.location.href = "index.html";
    }
});

function loadAdminData() {
    onSnapshot(collection(db, "products"), (snap) => {
        const list = document.getElementById('inventory-list');
        list.innerHTML = '';
        snap.forEach(d => {
            const p = d.data();
            list.innerHTML += `
                <div class="p-3 bg-black border border-white/5 flex justify-between text-[10px] items-center">
                    <span>${p.name} - ${p.price}₾</span>
                    <button onclick="window.delProd('${d.id}')" class="text-red-600 hover:underline">წაშლა</button>
                </div>`;
        });
    });

    const qOrders = query(collection(db, "orders"), orderBy("time", "desc"));
    onSnapshot(qOrders, (snap) => {
        const list = document.getElementById('orders-list');
        list.innerHTML = '';
        snap.forEach(d => {
            const o = d.data();
            list.innerHTML += `
                <div class="p-4 bg-black border-l-2 border-red-600 text-[9px] mb-2 flex justify-between items-center">
                    <div>
                        <b class="text-white uppercase">${o.product}</b><br>
                        <span class="text-gray-500">${o.email} | ${o.phone}</span><br>
                        <span class="text-gray-400 italic">${o.address}</span>
                    </div>
                    <button onclick="window.delOrder('${d.id}')" class="text-gray-500 hover:text-white">✕</button>
                </div>`;
        });
    });
}

window.uploadProduct = async () => {
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const image = document.getElementById('p-img').value;
    const desc = document.getElementById('p-desc').value; // ახალი აღწერა
    if(!name || !price) return alert("შეავსეთ მონაცემები");
    await addDoc(collection(db, "products"), { name, price: Number(price), image, description: desc, createdAt: new Date() });
    alert("პროდუქტი დამატებულია");
    document.getElementById('p-name').value = '';
    document.getElementById('p-price').value = '';
    document.getElementById('p-img').value = '';
    document.getElementById('p-desc').value = '';
};

window.searchUser = async () => {
    const phone = document.getElementById('search-phone-input').value.trim();
    if(!phone) return;
    const q = query(collection(db, "users"), where("phone", "==", phone));
    const snap = await getDocs(q);
    const res = document.getElementById('user-result');
    res.innerHTML = '';
    if(snap.empty) { alert("ვერ მოიძებნა"); return; }
    res.classList.remove('hidden');
    snap.forEach(d => {
        const u = d.data();
        res.innerHTML = `<div>📧 ${u.email}</div><div>📞 ${u.phone}</div><div>📍 ${u.address}</div>`;
    });
};

window.delProd = async (id) => { if(confirm("წავშალოთ პროდუქტი?")) await deleteDoc(doc(db, "products", id)); };
window.delOrder = async (id) => { if(confirm("წავშალოთ შეკვეთა?")) await deleteDoc(doc(db, "orders", id)); };
