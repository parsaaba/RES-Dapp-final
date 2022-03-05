web3Provider = null;
contracts = {};
url = "http://127.0.0.1:7545";
currentAccount = null;

superVisor = null;  // آدرس سوپروایزر شهر که می تواند خانه های جدید را تعریف و قیمت آنها را کم و زیاد کند
assetCount = 0;     // تعداد کل دارایی های تعریف شده
Assets = [];        // لیست کل دارایی ها - Assets: [ [assetId, price] , [assetId, price] , [] ]
OwnerAdds = [];     // لیست مالکان

$(function(){
    $(window).load(function(){
        init();
    });
});

function init() {
    return initWeb3();
}

function initWeb3() {
    if (typeof web3 !== 'undefined') {
        // If a web3 instance is already provided by Meta Mask.
        web3Provider = web3.currentProvider;
        web3 = new Web3(web3Provider);
    } else {
        // Specify default instance if no web3 instance provided
        web3Provider = new Web3.providers.HttpProvider(url);
        web3 = new Web3(web3Provider);
    }

    ethereum.on('accountsChanged', handleAccountChanged);
    ethereum.on('chainChanged', handleChainChanged);

    // ست کردن اکانت پیش فرض
    web3.eth.defaultAccount = web3.eth.accounts[0];

    ethereum.enable();
    return initContract();
}


function initContract() {
    $.getJSON('RES.json', function(artifact){
        // Create contract object form that artifact
        contracts.RealEstate = TruffleContract(artifact);
        contracts.RealEstate.setProvider(web3Provider);

        // Set Current Account
        currentAccount = web3.eth.defaultAccount;

        // نمایش اکانت جاری در هدر صفحه
        setCurrentAccount();

        // گرفتن آدرس سوپروایزر و نمایش در هدر صفحه
        getSupervisor();

        // گرفتن تعداد دارایی های اکانت جاری و نمایش در بخش لیست دارایی ها
        getBalance();

        // استخراج تمام دارایی های تعریف شده تا کنون و نمایش در لیست کل دارایی ها
        fetchAllAssets();
    });
    return bindEvents();
}


function bindEvents() {
    $(document).on("click", "#add_asset", addAsset);
    $(document).on("click", "#appreciate_asset", appreciate);
    $(document).on("click", "#depreciate_asset", depreciate);
    $(document).on("click", "#approve_asset", approveAsset);
    $(document).on("click", "#transfer_asset", transferAsset);
    populateAddresses();
}


function handleAccountChanged() {
    ethereum.request({method: 'eth_requestAccounts'}).then(function(accounts){
        currentAccount = accounts[0];
        // وقتی اکانت جاری تغییر میکند باید اکانت پیش فرض وب3 را بروز کنیم
        web3.eth.defaultAccount = currentAccount;
        setCurrentAccount();

        // نوع کاربری اکانت را تشخیص داده و در هدر صفحه نمایش میدهیم
        if(currentAccount.toLowerCase() == supervisor.toLowerCase()) {
            $("#account_type").text("Supervisor");
        } else {
            $("#account_type").text("Owner");
        }

        // بروزرسانی اطلاعات دارایی های اکانت جدید
        getBalance();
        fetchAllAssets();
    });
}


async function handleChainChanged() {
    // ریلود شدن صفحه
    window.location.reload();
}


function setCurrentAccount() {
    $("#current_account").html(currentAccount);
}


function getSupervisor() {
    var RESInstance;
    contracts.RealEstate.deployed().then(function(instance){
        RESInstance = instance;
        return RESInstance.supervisor();
    }).then(function(result){

        // گرفتن آدرس سوپروایزر
        supervisor = result;

        // نمایش آدرس سوپروایزر در هدر صفحه
        $("#supervisor").html(supervisor);

        // نوع کاربری اکانت را تشخیص داده و در هدر صفحه نمایش میدهیم
        if(currentAccount.toLowerCase() == supervisor.toLowerCase()) {
            $("#account_type").text("Supervisor");
        } else {
            $("#account_type").text("Owner");
        }

    }).catch(function(err){
        console.log("Error in getSupervisor() : ", err.message);
    });
}


function getBalance() {
    var RESInstance;
    contracts.RealEstate.deployed().then(function(instance){
        RESInstance = instance;
        return RESInstance.balanceOf(currentAccount);
    }).then(function(result){

        // نمایش تعداد دارایی های اکانت جاری
        if(result == 0)
            $("#balance").html("");
        else {
            var tokenTxt = " Token";
            if(result > 1)
                tokenTxt = " Tokens";
            var tag = result + tokenTxt;
            $("#balance").html(tag);
        }

    }).catch(function(err){
        console.log("Error in getSupervisor() : ", err.message);
    });
}


function populateAddresses() {
    new Web3(new Web3.providers.HttpProvider(url)).eth.getAccounts(function(err, accounts){
        $.each(accounts, function(i){
            var tag = '<option value="' + accounts[i] + '">' + accounts[i] + '</option>';
            $("#asset_owner").append(tag);
            $("#to_address").append(tag);
            $("#from_address").append(tag);
        });
    });
}


function addAsset() {
    // only Supervisor!
    if(currentAccount.toLowerCase() != supervisor.toLowerCase()){
        alert("only the Supervisor Account can mint!");
        return false;
    }
    if($("#asset_price").val() === "" || $("#asset_owner").val() === "") {
        alert("Please Enter all Fields!");
        return false;
    }
    var RESInstance;
    contracts.RealEstate.deployed().then(function(instance){
        RESInstance = instance;
        var price = $("#asset_price").val();
        var owner = $("#asset_owner").val();
        var txObj = {from: supervisor};
        return RESInstance.addAsset(price, owner, txObj);
    }).then(function(result){
        location.reload();  //  F5 ~ refresh
        fetchAllAssets();
        console.log("addAsset() => ", result.receipt.status);  // 0x01 = true ~ Success
    }).catch(function(err){
        console.log("Error in addAsset() : ", err.message);
    });
}

function appreciate() {
    // only Supervisor!
    if(currentAccount.toLowerCase() != supervisor.toLowerCase()){
        alert("only the Supervisor Account can mint!");
        return false;
    }
    if($("#assess_asset_id").val() === "" || $("#assess_value").val() === "") {
        alert("Please Enter all Fields!");
        return false;
    }
    var RESInstance;
    contracts.RealEstate.deployed().then(function(instance){
        RESInstance = instance;
        var asset_id = $("#assess_asset_id").val();
        var asset_value = $("#assess_value").val();
        var txObj = {from: supervisor};
        return RESInstance.appreciate(parseInt(asset_id), parseInt(asset_value), txObj);
    }).then(function(result){
        location.reload();  //  F5 ~ refresh
        fetchAllAssets();
        console.log("appreciate() => ", result.receipt.status);  // 0x01 = true ~ Success
    }).catch(function(err){
        console.log("Error in appreciate() : ", err.message);
    });
}

function depreciate() {
    // only Supervisor!
    if(currentAccount.toLowerCase() != supervisor.toLowerCase()){
        alert("only the Supervisor Account can mint!");
        return false;
    }
    if($("#assess_asset_id").val() === "" || $("#assess_value").val() === "") {
        alert("Please Enter all Fields!");
        return false;
    }
    var RESInstance;
    contracts.RealEstate.deployed().then(function(instance){
        RESInstance = instance;
        var asset_id = $("#assess_asset_id").val();
        var asset_value = $("#assess_value").val();
        var txObj = {from: supervisor};
        return RESInstance.depreciate(parseInt(asset_id), parseInt(asset_value), txObj);
    }).then(function(result){
        location.reload();  //  F5 ~ refresh
        fetchAllAssets();
        console.log("depreciate() => ", result.receipt.status);  // 0x01 = true ~ Success
    }).catch(function(err){
        console.log("Error in depreciate() : ", err.message);
    });
}

function approveAsset() {
    if($("#asset_id").val() === "" || $("#to_address").val() === "") {
        alert("Please Enter all Fields!");
        return false;
    }
    var RESInstance;
    contracts.RealEstate.deployed().then(function(instance){
        RESInstance = instance;
        var asset_id = $("#asset_id").val();
        var to_address = $("#to_address").val();
        var txObj = {from: currentAccount};
        return RESInstance.approve(to_address, parseInt(asset_id), txObj);
    }).then(function(result){
        location.reload();  //  F5 ~ refresh
        fetchAllAssets();
        console.log("approveAsset() => ", result.receipt.status);  // 0x01 = true ~ Success
    }).catch(function(err){
        console.log("Error in approveAsset() : ", err.message);
    });
}


function transferAsset() {
    if($("#from_address").val() === "" || $("#transfer_asset_id").val() === "") {
        alert("Please Enter all Fields!");
        return false;
    }
    var RESInstance;
    contracts.RealEstate.deployed().then(function(instance){
        RESInstance = instance;
        var from_address = $("#from_address").val();
        var asset_id = $("#transfer_asset_id").val();
        var price = Assets[asset_id][1];
        var txObj = {
            from: currentAccount,
            value: web3.toWei(parseInt(price), "ether")
        };
        return RESInstance.transferFrom(from_address, parseInt(asset_id), txObj);
    }).then(function(result){
        location.reload();  //  F5 ~ refresh
        fetchAllAssets();
        console.log("transferAsset() => ", result.receipt.status);  // 0x01 = true ~ Success
    }).catch(function(err){
        console.log("Error in transferAsset() : ", err.message);
    });
}

function fetchAllAssets() {
    var RESInstance;
    contracts.RealEstate.deployed().then(function(instance){
        RESInstance = instance;
        return RESInstance.assetCount();
    }).then(function(result){
        assetCount = result.toNumber();
        console.log("AssetCount: ", assetCount);
        return getAssets(0);
    }).catch(function(err){
        console.log("Error in fetchAllAssets() : ", err.message);
    });
}

/*
    for(int i=0; i<assetCount; i++) {
        getAsset(i);
    }
*/
function getAssets(i) {
    if(i < assetCount) {
        var RESInstance;
        contracts.RealEstate.deployed().then(function(instance){
            RESInstance = instance;
            return RESInstance.assetMap(i);
        }).then(function(result){
            Assets.push([result.assetId, result.price]);
            return getAssets(i+1);
        }).catch(function(err){
            console.log("Error in getAssets() : ", err.message);
        });
    } else {
        return getOwnerAddress(0);
    }
}

function getOwnerAddress(i) {
    if(i < assetCount) {
        var RESInstance;
        contracts.RealEstate.deployed().then(function(instance){
            RESInstance = instance;
            return RESInstance.ownerOf(i);
        }).then(function(result){
            OwnerAdds.push(result);
            return getOwnerAddress(i+1);
        }).catch(function(err){
            console.log("Error in getOwnerAddress() : ", err.message);
        });
    } else {
        $("#assets").text("");
        $("#assets_total").text("");
        return getApprovedAddress(0);
    }
}

function getApprovedAddress(i) {
    if(i < assetCount) {
        var RESInstance;
        contracts.RealEstate.deployed().then(function(instance){
            RESInstance = instance;
            return RESInstance.assetApprovals(i);
        }).then(function(result){

            if(result == 0) {
                result = "None";
            }

            var cardTag =   '<div class="col-md-4">'+
                                '<div class="card">' + 
                                    '<div class="card-body">' + 
                                        '<h5 class="card-title"><b>AssetID: </b>' + i + '</h5>' +
                                        '<h5 class="card-title"><b>Price: </b>' + Assets[i][1] + ' Eth</h5>' +
                                        '<div class="card-footer">' + 
                                            '<b>Owner: </b><small>' + OwnerAdds[i] + '</small>' + '<br>' +
                                            '<b>Approved: </b><small>' + result + '</small>' + 
                                        '</div>'+
                                    '</div>'+
                                '</div>'+
                            '</div>'
            
            // در بخش دارایی های تحت مالکیت اکانت جاری، فقط دارایی های این اکانت نمایش داده می شود
            if(OwnerAdds[i].toLowerCase() == currentAccount.toLowerCase())
                $("#assets").append(cardTag);

            // در بخش تمام دارایی ها، در هر صورت تمام دارایی ها نمایش داده خواهد شد
            $("#assets_total").append(cardTag);
                            
            return getApprovedAddress(i+1);
        }).catch(function(err){
            console.log("Error in getApprovedAddress() : ", err.message);
        });
    }
}