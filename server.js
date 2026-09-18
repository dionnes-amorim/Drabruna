const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(cors());
app.use(express.json({limit:'2mb'}));
app.use(express.static(__dirname));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
let TOKEN_ATUAL = null;

app.post('/api/login', (req,res)=>{
  if(req.body.email===process.env.ADMIN_EMAIL && req.body.password===process.env.ADMIN_PASS){
    TOKEN_ATUAL='tk_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    return res.json({token:TOKEN_ATUAL});
  }
  res.status(401).json({error:'E-mail ou senha incorretos'});
});

function auth(req,res,next){
  const t=(req.headers.authorization||'').replace('Bearer ','');
  if(t!==TOKEN_ATUAL) return res.status(401).json({error:'Não autorizado'});
  next();
}

app.get('/api/relatos', auth, async (req,res)=>{
  try{
    let {data} = await supabase.from('denuncias').select('*').order('created_at',{ascending:false}).limit(500);
    if(!data || data.length===0){
      const r2 = await supabase.from('relatos').select('*').order('created_at',{ascending:false}).limit(500);
      data = r2.data || [];
    }
    res.json(data.map(r=>({...r, data_br:r.created_at?new Date(r.created_at).toLocaleDateString('pt-BR'):'', descricao:r.descricao||r.mensagem||'', anonimo:r.anonimo||!r.nome })));
  }catch(e){ console.log(e); res.json([]); }
});

app.put('/api/relatos/:id', auth, async (req,res)=>{
  try{
    let {data,error} = await supabase.from('denuncias').update(req.body).eq('id',req.params.id).select();
    if(error ||!data || data.length===0){
      data = (await supabase.from('relatos').update(req.body).eq('id',req.params.id).select()).data;
    }
    res.json(data);
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.post('/api/denuncias', async (req,res)=>{
  // RESPONDE RÁPIDO E NÃO TRAVA
  res.json({ok:true, msg:'Recebido'});
  // salva em background
  try{
    const b=req.body;
    const payload={tipo:b.tipo,nome:b.nome,setor:b.setor,descricao:b.descricao||b.mensagem,mensagem:b.descricao||b.mensagem,gravidade:b.gravidade,local:b.local,anonimo:b.anonimo,status:'Novo'};
    let {error} = await supabase.from('denuncias').insert([payload]);
    if(error) await supabase.from('relatos').insert([payload]);
    console.log('Salvo OK');
  }catch(e){ console.log('Erro salvar', e.message); }
});

app.listen(process.env.PORT||10000, ()=>console.log('RODANDO'));
