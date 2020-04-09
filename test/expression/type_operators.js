import test from 'tape'
import mingo from '../../lib'


test('Type Conversion: $toBool', function (t) {
  let data = [
    { _id: 1, item: "apple",  qty: 5, shipped: true },
    { _id: 2, item: "pie",  qty: 10, shipped: 0  },
    { _id: 3, item: "ice cream", shipped: 1 },
    { _id: 4, item: "almonds", qty: 2, shipped: "true" },
    { _id: 5, item: "pecans", shipped: "false" },  // Note: All strings convert to true
    { _id: 6, item: "nougat", shipped: ""  }       // Note: All strings convert to true
  ]

  // Define stage to add convertedShippedFlag field with the converted shipped value
  // Because all strings convert to true, include specific handling for "false" and ""
  let shippedConversionStage = {
    $addFields: {
      convertedShippedFlag: {
          $switch: {
            branches: [
              { case: { $eq: [ "$shipped", "false" ] }, then: false } ,
              { case: { $eq: [ "$shipped", "" ] }, then: false }
            ],
            default: { $toBool: "$shipped" }
        }
      }
    }
  };

  // Define stage to filter documents and pass only the unshipped orders
  let unshippedMatchStage = { $match: { "convertedShippedFlag": false } }

  let result = mingo.aggregate(data, [
    shippedConversionStage,
    unshippedMatchStage
  ])

  t.deepEqual(result, [
    { "_id" : 2, "item" : "pie", "qty" : 10, "shipped" : 0, "convertedShippedFlag" : false },
    { "_id" : 5, "item" : "pecans", "shipped" : "false", "convertedShippedFlag" : false },
    { "_id" : 6, "item" : "nougat", "shipped" : "", "convertedShippedFlag" : false }
  ], 'can apply $toBool')

  t.end()
})

test('Type Conversion: $toLong', function (t) {
  let data = [
    { _id: 1, item: "apple", qty: 5 },
    { _id: 2, item: "pie", qty: "100" },
    { _id: 3, item: "ice cream", qty: 500 },
    { _id: 4, item: "almonds", qty: "50" }
  ]

  let result = mingo.aggregate(data, [
    { $addFields: { convertedQty: { $toLong: "$qty" } } }
  ])

  t.deepEqual(result, [
    { "_id" : 1, "item" : "apple", "qty" : 5, "convertedQty" : 5 },
    { "_id" : 2, "item" : "pie", "qty" : "100", "convertedQty" : 100 },
    { "_id" : 3, "item" : "ice cream", "qty" : 500, "convertedQty" : 500 },
    { "_id" : 4, "item" : "almonds", "qty" : "50", "convertedQty" : 50 }
  ], 'can apply $toLong')

  t.end()
})

test('Type Conversion Operators', function (t) {

  let result = mingo.aggregate([
    { _id: 1, item: "apple",  qty: 5, zipcode: 12345 },
    { _id: 2, item: "pie",  qty: 10, zipcode: 11111 },
    { _id: 3, item: "ice cream",  zipcode: "12345" },
    { _id: 4, item: "almonds", qty: 2, zipcode: "12345-0030" },
  ], [
    { $addFields: { convertedZipCode: { $toString: "$zipcode" } } },
    // Define stage to sort documents by the converted zipcode
    { $sort: { "convertedZipCode": 1 } }
  ])

  t.deepEqual([
    { "_id" : 2, "item" : "pie", "qty" : 10, "zipcode" : 11111, "convertedZipCode" : "11111" },
    { "_id" : 1, "item" : "apple", "qty" : 5, "zipcode" : 12345, "convertedZipCode" : "12345" },
    { "_id" : 3, "item" : "ice cream", "zipcode" : "12345", "convertedZipCode" : "12345" },
    { "_id" : 4, "item" : "almonds", "qty" : 2, "zipcode" : "12345-0030", "convertedZipCode" : "12345-0030" }
  ], result, 'can apply $toString operator')

  // Testing $toInt, $toLong, $toDouble, $toDecimal


  result = mingo.aggregate([
    { _id: 1, item: "apple", qty: 5, price: 10 },
    { _id: 2, item: "pie", qty: 10, price: 20.0 },
    { _id: 3, item: "ice cream", qty: 2, price: "4.99" },
    { _id: 4, item: "almonds" ,  qty: 5, price: 5 }
  ], [
    // Define stage to add convertedPrice and convertedQty fields with the converted price and qty values
    {
      $addFields: {
        convertedPrice: { $toDecimal: "$price" },
        convertedQty: { $toInt: "$qty" },
      }
    },
    // Define stage to calculate total price by multiplying convertedPrice and convertedQty fields
    {
      $project: { item: 1, totalPrice: { $multiply: [ "$convertedPrice", "$convertedQty" ] } }
    }
  ])

  t.deepEqual([
    { "_id" : 1, "item" : "apple", "totalPrice" :  50.0000000000000 },
    { "_id" : 2, "item" : "pie", "totalPrice" : 200.0 },
    { "_id" : 3, "item" : "ice cream", "totalPrice" : 9.98 },
    { "_id" : 4, "item" : "almonds", "totalPrice" : 25.00000000000000 }
  ], result, 'can apply $toInt/$toLong and $toDouble/$toDecimal')

  result = mingo.aggregate([
    { _id: 1, item: "apple", qty: 5, order_date: new Date("2018-03-10") },
    { _id: 2, item: "pie", qty: 10,  order_date: new Date("2018-03-12")},
    { _id: 3, item: "ice cream", qty: 2, price: "4.99", order_date: "2018-03-05" },
    { _id: 4, item: "almonds" ,  qty: 5, price: 5,  order_date: "2018-03-05"}
  ], [
    // Define stage to add convertedDate field with the converted order_date value
    { $addFields: { convertedDate: { $toDate: "$order_date" } } },
    // Define stage to sort documents by the converted date
    { $sort: { "convertedDate": 1 } }
  ])

  t.deepEqual(result, [
    { "_id" : 3, "item" : "ice cream", "qty" : 2, "price" : "4.99", "order_date" : "2018-03-05", "convertedDate" : new Date("2018-03-05T00:00:00Z") },
    { "_id" : 4, "item" : "almonds", "qty" : 5, "price" : 5, "order_date" : "2018-03-05", "convertedDate" : new Date("2018-03-05T00:00:00Z") },
    { "_id" : 1, "item" : "apple", "qty" : 5, "order_date" : new Date("2018-03-10T00:00:00Z"), "convertedDate" : new Date("2018-03-10T00:00:00Z") },
    { "_id" : 2, "item" : "pie", "qty" : 10, "order_date" : new Date("2018-03-12T00:00:00Z"), "convertedDate" : new Date("2018-03-12T00:00:00Z") }
  ], "can apply $toDate")

  // Test $convert operator

  result = mingo.aggregate([
    { _id: 1, item: "apple", qty: 5, price: 10 },
    { _id: 2, item: "pie", qty: 10, price: Number("20.0") },
    { _id: 3, item: "ice cream", qty: 2, price: "4.99" },
    { _id: 4, item: "almonds" },
    { _id: 5, item: "bananas", qty: 5000000000, price: Number("1.25") }
  ], [
    // Define stage to add convertedPrice and convertedQty fields with the converted price and qty values
    // If price or qty values are missing, the conversion returns a value of decimal value or int value of 0.
    // If price or qty values cannot be converted, the conversion returns a string
    {
      $addFields: {
        convertedPrice: { $convert: { input: "$price", to: "decimal", onError: "Error", onNull: Number("0") } },
        convertedQty: { $convert: {
            input: "$qty", to: "int",
            onError:{$concat:["Could not convert ", {$toString:"$qty"}, " to type integer."]},
            onNull: Number("0")
        } },
      }
    },
    // calculate total price
    {
      $project: { totalPrice: {
        $switch: {
          branches: [
            { case: { $eq: [ { $type: "$convertedPrice" }, "string" ] }, then: "NaN" },
            { case: { $eq: [ { $type: "$convertedQty" }, "string" ] }, then: "NaN" },
          ],
          default: { $multiply: [ "$convertedPrice", "$convertedQty" ] }
        }
    } } }
  ])

  t.deepEqual(result, [
    { "_id" : 1, "totalPrice" : Number("50.0000000000000") },
    { "_id" : 2, "totalPrice" : Number("200.0") },
    { "_id" : 3, "totalPrice" : Number("9.98") },
    { "_id" : 4, "totalPrice" : Number("0") },
    { "_id" : 5, "totalPrice" : 'NaN' }
  ], 'can apply $convert')

  t.end()
})
