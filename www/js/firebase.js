dbg("?? firebase.js démarré");

let db = null;

function getScoresRef(level){
  if(!db){
    dbg("?? getScoresRef sans db");
    return null;
  }
  const key = String(level) + "s"; // "15s", "30s", "60s"
  return db.ref("scores/" + key);
}

try{
  firebase.initializeApp({
    apiKey:"AIzaSyCeHwyUe32aOlCNjPZQxekfr9M6AxaJC-0",
    authDomain:"fast-and-spermious.firebaseapp.com",
    databaseURL:"https://fast-and-spermious-default-rtdb.europe-west1.firebasedatabase.app",
    projectId:"fast-and-spermious",
    storageBucket:"fast-and-spermious.appspot.com",
    appId:"1:791766983410:web:6b1d77401727b52f60a66b"
  });
  dbg("? Firebase initialisé");
  db = firebase.database();
  dbg("? db OK");
}catch(e){
  dbg("? ERREUR INIT FIREBASE", String(e));
}

async function firebaseSaveScore(data, level){
  dbg("?? SAVE", data, "level=", level);
  const ref = getScoresRef(level);
  if(!ref){
    dbg("? firebaseSaveScore ref null");
    return {ok:0,err:"ref_null"};
  }
  try{
    await ref.push(data);
    dbg("? Score envoyé");
    return {ok:1};
  }catch(e){
    dbg("? SAVE ERROR", String(e));
    return {ok:0,err:String(e)};
  }
}

function firebaseLoadTop(level, n=20){
  dbg("?? LOAD classement level=", level);
  const ref = getScoresRef(level);
  if(!ref){
    dbg("? firebaseLoadTop ref null");
    return Promise.resolve([]);
  }

  return new Promise(function(resolve){
    ref.orderByChild("score").limitToLast(n).once("value", function(snap){
      let arr = [];
      snap.forEach(function(child){
        let v = child.val() || {};
        if(typeof v.score === "string"){
          v.score = parseInt(v.score, 10) || 0;
        }
        arr.push(v);
      });
      arr.sort(function(a,b){ return (b.score||0) - (a.score||0); });
      dbg("?? Scores reçus:", arr.length, arr);
      resolve(arr);
    }, function(err){
      dbg("? LOAD ERROR", String(err));
      resolve([]);
    });
  });
}
