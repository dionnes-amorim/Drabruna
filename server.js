const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// SUPABASE
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// LOGIN SEGURO - senha NÃO fica no código, fica no Render
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@delipack.com.br';
const ADMIN_PASS = process.env.ADMIN_PASS || 'delipack123';

// guarda tokens válidos na memória
const tokensValidos = new Set();

app.post('/api/login', (req,res)=>{
  const {email,password} = req.body;
  console.log('Tentativa:', email);
  if(email === ADMIN_EMAIL && password === ADMIN_PASS){
    const token = crypto.randomBytes(32).toString('hex');
    tokensValidos.add(token);
    return res.json({token});
  }
  return res.status(401).json({error:'E-mail ou senha incorretos'});
});

// middleware pra proteger
function auth(req,res,next){
  const t = (req.headers.authorization||'').replace('Bearer ','');
  if(!tokensValidos.has(t)) return res.status(401).json({error:'Não autorizado'});
  next();
}

app.get('/api/relatos', auth, async (req,res)=>{
  const {data, error} = await supabase.from('denuncias').select('*').order('created_at',{ascending:false});
  if(error) return res.status(500).json(error);
  // formata pro seu painel
  const lista = data.map(r=>({
    ...r,
    data_br: new Date(r.created_at).toLocaleDateString('pt-BR'),
    dataBR: new Date(r.created_at).toLocaleDateString('pt-BR'),
    nome: r.nome || 'Anônimo',
    anonimo: !r.nome || r.anonimo,
    gravidade: r.gravidade || 'Média',
    local: r.local || r.setor,
    descricao: r.descricao || r.mensagem || '',
    resposta_admin: r.resposta_admin,
    acao_tomada: r.acao_tomada,
    status: r.status || 'Novo'
  }));
  res.json(lista);
});

app.put('/api/relatos/:id', auth, async (req,res)=>{
  const {data,error} = await supabase.from('denuncias').update(req.body).eq('id',req.params.id).select();
  if(error) return res.status(500).json(error);
  res.json(data);
});

// criar denuncia (do site publico)
app.post('/api/denuncias', async (req,res)=>{
  const {data,error} = await supabase.from('denuncias').insert([req.body]).select();
  if(error) return res.status(500).json(error);
  res.json(data);
});

app.listen(process.env.PORT||10000, ()=>console.log('OK'));
