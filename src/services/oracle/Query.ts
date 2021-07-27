export interface Query {
  query:string,
  params:any
}

export function getQuery(tableName:string,keyWhere?:string):string{
  let whereClause = '';
  if(keyWhere) {
    whereClause = `where ${keyWhere} = :0`
  }
  return `select * from ${tableName} ${whereClause}`;
}

export function InserQuery<T>(tableName:string,obj:T):Query{
  const keys = Object.keys(obj);
  const values = Object.values(obj);
  const arrayQuestion = [];
  keys.forEach((item,index) => {
    arrayQuestion.push(`:${index}`);
  })
  const query = `INSERT INTO ${tableName} (${keys.join()}) VALUES (${arrayQuestion.join()})`;
  return {
    query,
    params:values,
  } 
}

export function updateQuery<T>(tableName:string,obj:T,keyWhere:string):Query{
  const keys = Object.keys(obj);
  const values = Object.values(obj);
  const arrayQuestion = [];
  let valuesWhere = '';
  keys.forEach((item,index) => {
    if(item === keyWhere){
      valuesWhere = `:${index}`;
    }else{
      arrayQuestion.push(`${item} = :${index}`);
    }
  })
  const query = `UPDATE ${tableName} SET ${arrayQuestion.join()} WHERE ${keyWhere} = ${valuesWhere}`;
  console.log(query);
  return {
    query,
    params:values,
  }
}

export function deleteQuery<T>(tableName:string,keyWhere:string):string{
  return `DELETE FROM ${tableName} WHERE ${keyWhere} = :0`
}
