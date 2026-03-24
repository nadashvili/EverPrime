import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, addDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

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

let allProducts = [];
let currentPage = 1;

// კურსორის ლოგიკა
const cursor = document.getElementById('cursor');
document.addEventListener('mousemove', (e) => {
    if(cursor) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }
});

// ავტორიზაციის კონტროლი
onAuthStateChanged(auth, async (user) => {
    const authSec = document.getElementById('auth-section');
    const main = document.getElementById('main-content');
    const navUser = document.getElementById('nav-user-area');

    if (user) {
        authSec.classList.add('hidden');
        main.classList.remove('hidden');
        navUser.innerHTML = `<button onclick="window.toggleProfile()" class="nav-btn">${user.email.split('@')[0].toUpperCase()}</button>`;
        loadUserProfile(user.uid);
        loadProducts();
    } else {
        authSec.classList.remove('hidden');
        main.classList.add('hidden');
    }
});

function loadProducts() {
    onSnapshot(collection(db, "products"), (snap) => {
        allProducts = [];
        snap.forEach(d => allProducts.push({ id: d.id, ...d.data() }));
        window.filterProducts();
    });
}

// დეტალების მოდალის გამოჩენა
window.showDetails = (id) => {
    const p = allProducts.find(item => item.id === id);
    if(!p) return;
    
    const modal = document.getElementById('details-modal-overlay');
    const content = document.getElementById('details-content');
    
    content.innerHTML = `
        <div class="flex flex-col gap-6">
            <div class="w-full flex items-center justify-center bg-black/50 p-4 border border-white/5">
                <img src="${p.image || ''}" class="max-h-56 object-contain shadow-2xl shadow-red-600/20">
            </div>
            <div class="w-full text-left">
                <h2 class="font-['Syncopate'] text-1xl font-black italic uppercase text-red-600 mb-2">${p.name}</h2>
                <div class="text-white font-bold text-lg mb-4 tracking-tighter">${p.price}₾</div>
                <p class="text-gray-400 text-[10px] md:text-xs leading-relaxed uppercase whitespace-pre-line mb-5
            bg-white/5 p-3 border-l border-red-600">
                    ${p.description || 'აღწერა არ არის'}
                </p>
                <div class="flex flex-col gap-3">
                    <button onclick="window.order('${p.id}', '${p.name}'); window.closeDetails()" class="buy-btn">შეკვეთა</button>
                    <button onclick="window.closeDetails()" class="w-full py-2 text-[15px] text-red-500 hover:text-white uppercase font-bold tracking-widest transition">დახურვა</button>
                </div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    content.scrollTop = 0;
};

window.closeDetails = () => {
    document.getElementById('details-modal-overlay').style.display = 'none';
};

window.filterProducts = () => {
    const search = document.getElementById('search-input').value.toLowerCase();
    const sort = document.getElementById('sort-select').value;
    const grid = document.getElementById('product-grid');
    
    let filtered = allProducts.filter(p => p.name.toLowerCase().includes(search));
    if(sort === 'low') filtered.sort((a,b) => a.price - b.price);
    if(sort === 'high') filtered.sort((a,b) => b.price - a.price);

    const itemsPerPage = window.innerWidth < 768 ? 4 : 16;
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    
    if (currentPage > totalPages && totalPages > 0) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);

    grid.innerHTML = '';
    paginated.forEach(p => {
        const imgDisplay = p.image 
            ? `<img src="${p.image}" alt="${p.name}" class="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500">` 
            : `<span class="material-icons text-5xl opacity-10">bolt</span>`;

        grid.innerHTML += `
            <div class="product-card group reveal-up">
                <div class="h-55 w-full flex items-center justify-center bg-black/40 mb-6 border border-white/5 overflow-hidden ">
                    ${imgDisplay}
                </div>
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-['Syncopate'] text-[20px] font-bold uppercase italic">${p.name}</h3>
                    <span class="text-red-600 font-bold tracking-tighter">${p.price}₾</span>
                </div>
                <button onclick="window.showDetails('${p.id}')" class="details-btn">დეტალები</button>
                <button onclick="window.order('${p.id}', '${p.name}')" class="buy-btn">შეკვეთა</button>
            </div>`;
    });

    renderPagination(totalPages);
};

function renderPagination(total) {
    const container = document.getElementById('pagination-bottom');
    if (!container) return;
    container.innerHTML = '';
    if(total <= 1) return;

    for (let i = 1; i <= total; i++) {
        const isActive = i === currentPage;
        const btnClass = isActive 
            ? 'bg-red-600 border-red-600 text-white shadow-[0_0_15px_rgba(255,0,0,0.4)]' 
            : 'border-white/10 text-gray-500 hover:border-red-600 hover:text-white';
            
        container.innerHTML += `
            <button onclick="window.goToPage(${i})" class="w-12 h-12 border font-['Syncopate'] font-bold italic transition-all ${btnClass}">
                ${i}
            </button>
        `;
    }
}

window.goToPage = (page) => {
    currentPage = page;
    window.filterProducts();
    document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
};

async function loadUserProfile(uid) {
    const d = await getDoc(doc(db, "users", uid));
    if(d.exists()) {
        document.getElementById('u-phone-upd').value = d.data().phone || '';
        document.getElementById('u-address-upd').value = d.data().address || '';
    }
}

window.updateProfile = async () => {
    await setDoc(doc(db, "users", auth.currentUser.uid), {
        phone: document.getElementById('u-phone-upd').value,
        address: document.getElementById('u-address-upd').value
    }, {merge: true});
    alert("INTEL UPDATED");
    window.toggleProfile();
};

window.handleLogin = async () => {
    const email = document.getElementById('l-email').value;
    const pass = document.getElementById('l-pass').value;
    try { await signInWithEmailAndPassword(auth, email, pass); } catch(e) { alert(e.message); }
};

window.handleRegister = async () => {
    const email = document.getElementById('r-email').value;
    const pass = document.getElementById('r-pass').value;
    const phone = document.getElementById('r-phone').value;
    const addr = document.getElementById('r-address').value;
    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "users", res.user.uid), { email, phone, address: addr, role: "user" });
    } catch(e) { alert(e.message); }
};

window.handleLogout = () => signOut(auth).then(() => location.reload());
window.toggleProfile = () => document.getElementById('profile-modal').classList.toggle('hidden');
window.toggleAuth = () => {
    document.getElementById('login-form').classList.toggle('hidden');
    document.getElementById('register-form').classList.toggle('hidden');
};

window.order = async (id, name) => {
    const user = auth.currentUser;
    const uDoc = await getDoc(doc(db, "users", user.uid));
    const data = uDoc.data();
    if(!data.phone || !data.address) { alert("COMPLETE PROFILE FIRST"); window.toggleProfile(); return; }
    await addDoc(collection(db, "orders"), { product: name, email: user.email, phone: data.phone, address: data.address, time: new Date() });
    alert("ORDER DEPLOYED");
};
