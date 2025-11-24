##############################################################
# Script de test Firebase indépendant
# Génère test-firebase.html et l’ouvre dans Chrome
##############################################################

$root = "C:\FastAndSpermious\www"
$file = "$root\test-firebase.html"

# Vérifie l’existence du dossier
if (!(Test-Path $root)) {
    Write-Host "? Le dossier $root n'existe pas." -ForegroundColor Red
    exit
}

Write-Host "?? Création du fichier de test Firebase..." -ForegroundColor Cyan

@'
<!DOCTYPE html>
<html>
<body style="background:#000;color:#fff;font-family:sans-serif">

<h2>TEST FIREBASE — PC</h2>
<p>Ce test fonctionne sans Cordova. S’il échoue ici, Firebase est mal configuré.</p>

<button onclick="send()" style="padding:12px 20px;border-radius:12px;font-size:18px;">Tester écriture</button>
<pre id="log" style="margin-top:20px;font-size:16px;"></pre>

<script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-database-compat.js"></script>

<script>
const firebaseConfig = {
  apiKey: "AIzaSyCeHwyUe32aOlCNjPZQxekfr9M6AxaJC-0",
  authDomain: "fast-and-spermious.firebaseapp.com",
  databaseURL: "https://fast-and-spermious-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fast-and-spermious",
  storageBucket: "fast-and-spermious.appspot.com",
  messagingSenderId: "791766983410",
  appId: "1:791766983410:web:6b1d77401727b52f60a66b"
};

firebase.initializeApp(firebaseConfig);
const ref = firebase.database().ref("debug-test");

async function send(){
  document.getElementById("log").innerText = "Envoi…";
  try{
    await ref.push({ timestamp: Date.now() });
    document.getElementById("log").innerText = "? OK : Firebase fonctionne";
  }catch(e){
    document.getElementById("log").innerText = "? ERREUR : " + e;
  }
}
</script>

</body>
</html>
'@ | Out-File $file -Encoding UTF8 -Force

Write-Host "? test-firebase.html créé !" -ForegroundColor Green

# Ouvre automatiquement le fichier
Start-Process $file

Write-Host "?? Chrome ouvert. Clique sur TESTER ÉCRITURE pour vérifier Firebase." -ForegroundColor Yellow
