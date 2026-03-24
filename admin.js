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

// --- CUSTOM POPUP LOGIC ---
window.primeShow = (text, confirmMode = false, onConfirm = null) => {
    const modal = document.getElementById('prime-popup');
    const txt = document.getElementById('popup-text');
    const confirmBtn = document.getElementById('popup-confirm');
    const closeBtn = document.getElementById('popup-close');

    if(!modal) return; // იმ შემთხვევაში თუ HTML-ში არ გვიწერია

    txt.innerText = text;
    modal.classList.replace('hidden', 'flex');

    if (confirmMode) {
        confirmBtn.classList.remove('hidden');
        confirmBtn.onclick = () => {
            if (onConfirm) onConfirm();
            modal.classList.replace('flex', 'hidden');
        };
    } else {
        confirmBtn.classList.add('hidden');
    }

    closeBtn.onclick = () => modal.classList.replace('flex', 'hidden');
};

// --- AUTH CHECK ---
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
    // 1. პროდუქტების სია
    onSnapshot(collection(db, "products"), (snap) => {
        const list = document.getElementById('inventory-list');
        list.innerHTML = '';
        snap.forEach(d => {
            const p = d.data();
            list.innerHTML += `
                <div class="p-3 bg-black border border-white/5 flex justify-between text-[15px] items-center group">
                    <span class="text-gray-400 group-hover:text-white transition">${p.name} - <span class="text-red-600">${p.price}₾</span></span>
                    <button onclick="window.delProd('${d.id}')" class="text-red-900 hover:text-red-500 uppercase font-bold italic transition">წაშლა</button>
                </div>`;
        });
    });

    // 2. მომხმარებლების რაოდენობის (სტატისტიკის) ჩვენება
    onSnapshot(collection(db, "users"), (snap) => {
        const stats = document.getElementById('user-stats');
        if(stats) stats.innerText = `აქტიური ექაუნთები: ${snap.size}`;
    });

    // 3. შეკვეთების სია + დროის ფორმატირება
    const qOrders = query(collection(db, "orders"), orderBy("time", "desc"));
    onSnapshot(qOrders, (snap) => {
        const list = document.getElementById('orders-list');
        list.innerHTML = '';
        snap.forEach(d => {
            const o = d.data();
            
            // დროის ლამაზი ფორმატი
            const orderDate = o.time?.toDate() ? o.time.toDate().toLocaleString('ka-GE', {
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit'
            }) : 'ახლახანს';

            list.innerHTML += `
                <div class="p-4 bg-black border-l-2 border-red-600 text-[11px] mb-2 flex justify-between items-center reveal-up">
                    <div>
                        <div class="text-red-600 flex font-bold mb-1 italic opacity-80 underline uppercase">${orderDate}</div>
                        <b class="text-white uppercase text-[15px] tracking-tighter">${o.product}</b><br>
                        <span class="text-gray-500">${o.email} | ${o.phone}</span><br>
                        <span class="text-gray-400 italic">${o.address}</span>
                    </div>
                    <button onclick="window.delOrder('${d.id}')" class="text-gray-700 hover:text-white transition text-lg">✕</button>
                </div>`;
        });
    });
}

// --- FUNCTIONS ---

window.uploadProduct = async () => {
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const image = document.getElementById('p-img').value;
    const desc = document.getElementById('p-desc').value;
    
    if(!name || !price) return window.primeShow("შეავსეთ სახელი და ფასი!");

    await addDoc(collection(db, "products"), { 
        name, 
        price: Number(price), 
        image, 
        description: desc, 
        createdAt: new Date() 
    });

    window.primeShow("პროდუქტი წარმატებით დაემატა პრაიმ არსენალს");
    
    // ფორმის გასუფთავება
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
    
    if(snap.empty) { 
        window.primeShow("მონაცემები ვერ მოიძებნა"); 
        return; 
    }

    res.classList.remove('hidden');
    snap.forEach(d => {
        const u = d.data();
        res.innerHTML = `
            <div class="border-r border-white/5 p-2">📧 ${u.email}</div>
            <div class="border-r border-white/5 p-2">📞 ${u.phone}</div>
            <div class="p-2 italic text-gray-400 uppercase">📍 ${u.address}</div>
        `;
    });
};

window.delProd = async (id) => { 
    window.primeShow("ნამდვილად გსურთ პროდუქტის წაშლა?", true, async () => {
        await deleteDoc(doc(db, "products", id));
    });
};

window.delOrder = async (id) => { 
    window.primeShow("შეკვეთის წაშლა?", true, async () => {
        await deleteDoc(doc(db, "orders", id));
    });
};
