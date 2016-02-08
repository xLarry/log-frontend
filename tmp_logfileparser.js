

var fs = require('fs');
var moment = require('./moment/moment');

var logFilePath = ".\\logs";

// Receipt class to collect all necessary information about one customer. May represent two or three connected receipts in case of "EFTAfterTotal" or void receipts
var Receipt = function() {
	this.creationTime = 0;
	this.rawCreationTime = null;
	this.tillTenderTime = null; // Tender time reported by the till
	this.ringTime = null; // Ring time reported by the till
	this.tillTenderTimeList; // List of tender times reported by the till
	this.ringTimeList; // List of ring times reported by the till
	
	this.receiptType = null;
	
	this.ReceiptRelation = null; // "EFTAfterTotal"
	
	this.paymentType = null; // E.g. Credit, Debit, Cash
	this.paymentVariant = null; // E.g. "girocard"
	this.authorisationType = null;//"None"; // E.g. "Pin", "Signature"
	this.nfc = null;
	this.paymentTypeList = null;
	this.paymentVariantList = null;
	this.authorisationTypeList = null;
	this.paymentAttempts = 0;
	
	this.total = null;
}

// Return the object's attributes as a ";" separated line
Receipt.prototype.toCSV = function()
{
	if(!this.creationTime)
		return "";
	return [this.rawCreationTime, this.receiptType, this.receiptRelation, this.paymentAttempts, this.paymentTypeList, this.paymentType, this.paymentVariant, this.authorisationType, this.nfc, this.ringTime, this.tillTenderTime, this.ringTimeList, this.tillTenderTimeList, this.total].join(";");
}

// Check if the receipt contains the most important data
Receipt.prototype.isValid = function()
{
	if(!this.creationTime || !this.ringTime || !this.paymentType)
		return false;
	return true;
}

// Finalize the receipt, which means that missing fields are filled. Returns the result of isValid()
Receipt.prototype.finalize = function()
{
	// Add authorisation type "pin" which is not drawn from the log file
	if(!this.authorisationType)
	{
		if(this.nfc && this.total > 25)
		{
			this.authorisationType = "Pin";
		}else if(!this.nfc && (this.paymentType == "CREDIT" || this.paymentType == "DEBIT"))
		{
			this.authorisationType = "Pin";
		}else{
			this.authorisationType = "None";
		}
	}
	return this.isValid();
}

// Parse a timestamp from the log files and return a moment object.
function parseTimestamp(str)
{
	var ts = new moment(str, "DD.MM.YYYY HH:mm:ss.SSS");
	if(!ts.isValid())
		return moment.unix(0);
	return ts;
}

// Write csv header
console.log("Region;Store;Till;Receipt Creation;Receipt Type;Receipt Relation;Attempts;Payment Type List;Payment Type;Payment Variant;Authorisation Type;NFC;Ring Time;Tender Time;Ring Time List;Tender Time List;Total");

// Iterate log files
fs.readdir(logFilePath,function(err, files){
   if (err) {
       return console.error(err);
   }
   files.forEach( function (file){
	   var m = file.match(/till_(\d+)-(\d+)POS(\d+)/);
	   if(m)
	   {
			var region = m[1];
			var store = m[2];
			var till = m[3];
			// read current file asynchronously
			fs.readFile(logFilePath + "\\" + file, 'utf-8', function(err, data) {
				if(err){
					console.log(err);
				}else{
					var lines = data.toString().split("\n");
					var r = new Receipt();
					var leaveReceiptOpen = false;
					for(var i = 0; i != lines.length; ++i)
					{
						// New receipt created by the till
						var m = lines[i].match(/^#(\d+.\d+.\d+ \d+:\d+:\d+.\d+)#GEBITPOS_TILL#INFO#New receipt number \d+ created/);
						if(m)
						{
							if(leaveReceiptOpen){ // Because of "EFTAfterTotal" or "SALE_VOID"
								leaveReceiptOpen = false;
							}else{
								// Finalize receipt object and check validity, then write to output
								if(r.finalize())
									console.log(region + ";" + store + ";" + till + ";" + r.toCSV());
								// Create new receipt object
								r = new Receipt();
								r.creationTime = parseTimestamp(m[1]);
								r.rawCreationTime = m[1];
							}
						}
						
						// Ring time (scanning completed)
						var match = lines[i].match(/^#[\d\. :]+#NEWPOSS_KPI#INFO#Adding (\d+)s ring time, overall ring time now (\d+)s/);
						if(match)
						{
							if(!r.ringTime)
							{
								r.ringTime = parseFloat(match[2]);
								r.ringTimeList = match[2];
							}else{ // Repeated occurrence; Append!
								r.ringTime += parseFloat(match[1]);
								r.ringTimeList += "," + match[2];
							}
						}
						
						// Tendering time (cashing completed)
						var match = lines[i].match(/^#[\d\. :]+#NEWPOSS_KPI#INFO#Adding (\d+)s tender time, overall tender time now (\d+)s/);
						if(match)
						{
							if(!r.tillTenderTime)
							{
								r.tillTenderTime = parseFloat(match[2]);
								r.tillTenderTimeList = match[2];
							}else{ // Repeated occurrence; Append!
								r.tillTenderTime += parseFloat(match[1]);
								r.tillTenderTimeList += "," + match[2];
							}
						}
						
						// Payment method (Amount booked, either as credit, debit or cash; Line also appears in case of a failure)
						var match = lines[i].match(/^#[\d\. :]+#GEBITPOS_TILL#INFO#Create (CREDIT|DEBIT|CASH):([^:]*):?EUR (\d+.\d+) EUR/);
						if(match)
						{
							if(!r.paymentType) // First occurrence
							{
								r.paymentTypeList = match[1];
								r.paymentVariantList = match[2];
								r.totalList = match[3];
							}else{ // Repeated occurrence; Append!
								r.paymentTypeList += "," + match[1];
								r.paymentVariantList += "," + match[2];
								r.totalList += "," + match[3];
							}
							r.paymentAttempts += 1;
							r.paymentType = match[1];
							r.paymentVariant = match[2];
							r.total = parseFloat(match[3]);
						}
						
						// // Card payment key pushed
						// if(lines[i].match(/^#\d+.\d+.\d+ \d+:\d+:\d+.\d+#GEBITPOS_KEYBOARD#INFO#Triggered key 'card_payment' with input buffer/))
						// {
							// if(r.paymentType == "CASH")
								// r.receiptRelation = "TotalBeforeEFT";
						// }
						
						// Receipt type / shown when new receipt is created
						var m = lines[i].match(/^#[\d\. :]+#GEBITPOS_TILL#INFO#Receipt number \d+ for receipt type (\w+) locally created/)
						if(m)
						{
							if(m[1] == "SALE_VOID") // "Void" receipt, needs to be connected with next one
							{
								leaveReceiptOpen = true;
							}
							if(!r.receiptType)
							{
								r.receiptType = m[1];
							}else{ // Repeated occurrence; Append!
								r.receiptType += "," + m[1];
							}
						}
						
						// EFT after total (Special checks are run after pressing "Card payment" button, still before opening a new receipt)
						if(lines[i].match(/^#[\d\. :]+#GEBITPOS_APPLICATION#INFO#All checks for EFT after cash passed successfully/))
						{
							r.receiptRelation = "EFTAfterTotal"; // "EFTAfterTotal" started. Receipt needs to be connected with next one (i.e. with void receipt)
							leaveReceiptOpen = true;
						}
						
						// NFC Payment ("Contactless" written on customer receipt)
						if(lines[i].match(/^#[\d\. :]+#GEBITPOS_CARD_TERMINAL#INFO#Message from terminal received.*Receipt type: CUSTOMER.*Contactless/))
						{
							r.nfc = true;
						}
						
						// Authorisation with signature ("Unterschrift korrekt" shown on till display)
						if(lines[i].match(/^#[\d\. :]+#GEBITPOS_LINEDISPLAY#INFO#Updated line 1: Unterschrift korrekt/))
						{
							if(!r.authorisationType){
								r.authorisationType = "Signature";
							}else{
								r.authorisationType += "+Signature";
							}
						}
					}
				}
			}
			)
		}
   });
});