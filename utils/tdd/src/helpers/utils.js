const undefinedToNull = (x) =>
  Object.keys(x).reduce((p, c) => {
    p[c] = x[c] || null;
    return p;
  }, {});

const nullToUndefined = (x) =>
  Object.keys(x).reduce((p, c) => {
    p[c] = x[c] || undefined;
    return p;
  }, {});

function isMessageValid(msg) {
  try{
    let valid_msg = JSON.parse(msg);
    return valid_msg
  }
  catch(e){
    console.log(e.message);
    return e
  }
};

module.exports = { undefinedToNull, nullToUndefined, isMessageValid };
