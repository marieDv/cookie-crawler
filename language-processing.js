import nlp from 'compromise'
var allNames = [];

let doc = nlp(`Process — Studio for Art and Design was founded by Martin Grödl and Moritz Resl in 2015 and has since worked for a wide range of national and international clients including Massachusetts Institute of Technology, Sagmeister & Walsh, The Prodigy and Wienerberger. Their work is included in MAK — Museum of Applied Arts’ Design Collection and has been part of exhibitions at Design Museum Holon, Ars Electronica Festival, Vienna Biennale, Triennale di Milano and Expo Dubai. Process designed the official Austrian contribution to the 2021 London Design Biennale.

`);
let person = doc.match('#Person #Noun')
person = person.forEach(function (d, i) {
  // console.log(i + "" + d.text('reduced'));
  allNames[i] = d.text('reduced');
})
doc.text()
console.log(allNames)