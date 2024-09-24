import dotenv from 'dotenv'
import connectdb from './db/index.js';

import {app} from './app.js'

dotenv.config();

connectdb().then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`app running on port ${process.env.PORT}`)
    })
    }).catch((err)=>{
    console.log('server failed',err)
    })
    