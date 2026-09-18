const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

app.get('/api/denuncias', async (req,res)=>{
  const {data} = await supabase.from('denuncias').select('*').order('created_at',{ascending:false});
  res.json(data);
});
app.post('/api/denuncias', async (req,res)=>{
  const {data} = await supabase.from('denuncias').insert([req.body]).select();
  res.json(data);
});
app.listen(process.env.PORT||10000);
