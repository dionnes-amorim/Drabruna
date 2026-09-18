const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Pega do Render
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
console.log('ENV carregado:', !!process.env.SUPABASE_URL, !!process.env.SUPABASE_SERVICE_KEY);

let TOKEN_ATUAL = null;

app.post('/api/login', (req,res)=>{
  try{
    if(req.body.email === process.env.ADMIN_EMAIL && req.body.password === process.env.ADMIN_PASS){
      TOKEN_ATUAL = 'token_'+Date.now();
      console.log('Login OK');
      return res.json({token: TOKEN_ATUAL});
    }
    return res.status(401).json({error:'E-mail ou senha incorretos'});
  }catch(e){ console.log(e); res.status(500).json({error:e.message}) }
});

app.get('/api/relatos', async (req,res)=>{
  try{
    const auth = (req.headers.authorization||'').replace('Bearer ','');
    if(auth !== TOKEN_ATUAL) return res.status(401).json({error:'Não logado'});
    
    // Tenta nas duas tabelas pra não dar 502
    let {data, error} = await supabase.from('denuncias').select('*').order('created_at',{ascending:false});
    if(error || !data){
      console.log('Tentando tabela relatos...');
      const r2 = await supabase.from('relatos').select('*').order('created_at',{ascending:false});
      data = r2.data || [];
      error = r2.error;
    }
    if(error){ console.log(error); return res.json([]); }
    res.json(data);
  }catch(e){ console.log('ERRO /relatos', e); res.json([]); }
});

app.put('/api/relatos/:id', async (req,res)=>{
  try{
    const auth = (req.headers.authorization||'').replace('Bearer ','');
    if(auth !== TOKEN_ATUAL) return res.status(401).json({error:'Não logado'});
    let {data} = await supabase.from('denuncias').update(req.body).eq('id',req.params.id).select();
    if(!data || data.length===0){
      data = (await supabase.from('relatos').update(req.body).eq('id',req.params.id).select()).data;
    }
    res.json(data);
  }catch(e){ res.status(500).json({error:e.message}) }
});

app.post('/api/denuncias', async (req,res)=>{
  try{
    const {data} = await supabase.from('denuncias').insert([req.body]).select();
    res.json(data);
  }catch(e){ res.json([]) }
});

app.get('/', (req,res)=> res.sendFile(__dirname+'/index.html'));

app.listen(process.env.PORT||10000, ()=>console.log('RODANDO OK'));
