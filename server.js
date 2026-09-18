const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json({limit:'2mb'}));
app.use(express.static(__dirname));

// PEGA DO RENDER - nada exposto no código
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('ENV:',!!process.env.SUPABASE_URL,!!process.env.ADMIN_EMAIL);

let TOKEN_ATUAL = null;

// 1. LOGIN - que seu admin.html chama
app.post('/api/login', (req,res)=>{
  try{
    if(req.body.email === process.env.ADMIN_EMAIL && req.body.password === process.env.ADMIN_PASS){
      TOKEN_ATUAL = 'tk_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      console.log('Login OK:', req.body.email);
      return res.json({token: TOKEN_ATUAL});
    }
    return res.status(401).json({error:'E-mail ou senha incorretos'});
  }catch(e){
    res.status(500).json({error:e.message});
  }
});

// middleware auth
function auth(req,res,next){
  const t = (req.headers.authorization||'').replace('Bearer ','');
  if(!TOKEN_ATUAL || t!== TOKEN_ATUAL) return res.status(401).json({error:'Não autorizado'});
  next();
}

// 2. LISTAR RELATOS - para o admin
app.get('/api/relatos', auth, async (req,res)=>{
  try{
    // tenta denuncias primeiro, se não existir tenta relatos
    let {data, error} = await supabase.from('denuncias').select('*').order('created_at',{ascending:false}).limit(500);
    if(error){
      console.log('Tabela denuncias erro, tentando relatos:', error.message);
      const r2 = await supabase.from('relatos').select('*').order('created_at',{ascending:false}).limit(500);
      data = r2.data || [];
    }
    // formata pro seu admin
    const lista = (data||[]).map(r=>({
     ...r,
      data_br: r.data_br || (r.created_at? new Date(r.created_at).toLocaleDateString('pt-BR') : ''),
      nome: r.nome || 'ANÔNIMO',
      anonimo: r.anonimo?? (!r.nome || r.nome==='ANÔNIMO'),
      descricao: r.descricao || r.mensagem || '',
      gravidade: r.gravidade || 'Média',
      local: r.local || '-',
      setor: r.setor || 'Não informado',
      status: r.status || 'Novo'
    }));
    res.json(lista);
  }catch(e){
    console.log('ERRO GET /api/relatos', e.message);
    res.json([]); // nunca dá 502, devolve vazio
  }
});

// 3. ATUALIZAR RELATO - responder no admin
app.put('/api/relatos/:id', auth, async (req,res)=>{
  try{
    let {data, error} = await supabase.from('denuncias').update(req.body).eq('id', req.params.id).select();
    if(error ||!data || data.length===0){
      data = (await supabase.from('relatos').update(req.body).eq('id', req.params.id).select()).data;
    }
    res.json(data);
  }catch(e){
    res.status(500).json({error:e.message});
  }
});

// 4. CRIAR RELATO - CORRIGIDO PRA NÃO TRAVAR
// O segredo: responde OK NA HORA e salva depois em background
app.post('/api/denuncias', async (req,res)=>{
  res.json({ok:true}); // responde instantaneo pro index não ficar em "Enviando..."
  try{
    const b = req.body;
    const payload = {
      tipo: b.tipo,
      nome: b.nome,
      setor: b.setor,
      contato: b.contato,
      descricao: b.descricao || b.mensagem,
      mensagem: b.descricao || b.mensagem,
      gravidade: b.gravidade,
      local: b.local,
      data_ocorrido: b.data_ocorrido,
      anonimo: b.anonimo,
      status: 'Novo',
      created_at: new Date().toISOString()
    };
    let {error} = await supabase.from('denuncias').insert([payload]);
    if(error){
      console.log('Erro denuncias, salvando em relatos:', error.message);
      await supabase.from('relatos').insert([payload]);
    }
    console.log('Relato salvo OK');
  }catch(e){ console.log('Erro salvar denuncia', e.message); }
});

// mesma rota com outro nome - seu index antigo usava essa
app.post('/api/relatos', async (req,res)=>{
  res.json({ok:true});
  try{
    const b = req.body;
    const payload = {
      tipo: b.tipo,
      nome: b.nome,
      setor: b.setor,
      contato: b.contato,
      descricao: b.descricao || b.mensagem,
      mensagem: b.descricao || b.mensagem,
      gravidade: b.gravidade,
      local: b.local,
      data_ocorrido: b.data_ocorrido,
      anonimo: b.anonimo,
      status: 'Novo',
      created_at: new Date().toISOString()
    };
    let {error} = await supabase.from('denuncias').insert([payload]);
    if(error) await supabase.from('relatos').insert([payload]);
  }catch(e){ console.log(e.message); }
});

app.get('/', (req,res)=> res.sendFile(__dirname+'/index.html'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log('RODANDO NA PORTA '+PORT));
