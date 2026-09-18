const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
let TOKEN_ATUAL = null;

app.post('/api/login', (req,res)=>{
  if(req.body.email === process.env.ADMIN_EMAIL && req.body.password === process.env.ADMIN_PASS){
    TOKEN_ATUAL = 'token_'+Date.now();
    return res.json({token: TOKEN_ATUAL});
  }
  res.status(401).json({error: 'Senha errada. Confere no Render > ADMIN_EMAIL e ADMIN_PASS'});
});

app.get('/api/relatos', async (req,res)=>{
  const auth = (req.headers.authorization||'').replace('Bearer ','');
  if(auth !== TOKEN_ATUAL) return res.status(401).json({error:'Não logado'});
  const {data} = await supabase.from('denuncias').select('*').order('created_at',{ascending:false});
  res.json(data.map(r=>({...r, data_br: new Date(r.created_at).toLocaleDateString('pt-BR')})));
});

app.put('/api/relatos/:id', async (req,res)=>{
  const auth = (req.headers.authorization||'').replace('Bearer ','');
  if(auth !== TOKEN_ATUAL) return res.status(401).json({error:'Não logado'});
  const {data} = await supabase.from('denuncias').update(req.body).eq('id',req.params.id).select();
  res.json(data);
});

app.post('/api/denuncias', async (req,res)=>{
  const {data} = await supabase.from('denuncias').insert([req.body]).select();
  res.json(data);
});

app.listen(process.env.PORT||10000, ()=>console.log('RODANDO'));
