import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// PEGA DO RENDER ENV - NUNCA VAI PRO CÓDIGO FONTE DO NAVEGADOR
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// FUNCIONÁRIO ENVIA - sem precisar de login
app.post('/api/relatos', async (req, res) => {
  const { data, error } = await supabase.from('relatos').insert([req.body]);
  if(error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// ADMIN LOGIN - valida no Supabase
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error) return res.status(401).json({ error: error.message });
  res.json({ token: data.session.access_token, user: data.user });
});

// ADMIN LISTA - precisa do token
app.get('/api/relatos', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ','');
  if(!token) return res.status(401).json({error:'Não autorizado'});
  
  const { data: { user } } = await supabase.auth.getUser(token);
  if(!user) return res.status(401).json({error:'Sessão inválida'});

  const { data, error } = await supabase.from('relatos').select('*').order('created_at', {ascending:false});
  if(error) return res.status(400).json({error:error.message});
  res.json(data);
});

// ADMIN RESPONDE
app.put('/api/relatos/:id', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ','');
  const { data: { user } } = await supabase.auth.getUser(token);
  if(!user) return res.status(401).json({error:'Não autorizado'});

  const { error } = await supabase.from('relatos').update(req.body).eq('id', req.params.id);
  if(error) return res.status(400).json({error:error.message});
  res.json({ok:true});
});

app.get('/', (req,res)=> res.sendFile(path.join(__dirname,'index.html')));
app.get('/admin', (req,res)=> res.sendFile(path.join(__dirname,'admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('Rodando na porta '+PORT));
