// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <=0.6.0;

import "./helper_contracts/ERC721.sol";

contract RES is ERC721 {
    
    struct Asset {
        uint256 assetId;
        uint256 price;
    }

    uint256 public assetCount;
    address public supervisor;

    mapping(uint256=>Asset) public assetMap;
    mapping(uint256=>address) public assetApprovals;
    mapping(uint256=>address) public assetOwner;
    mapping(address=>uint256) public ownedAssetCount;

    constructor() public {
        supervisor = msg.sender;
    }

    // Event
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    ////////////////////////////////////////////////////////////////////////////////
    //                              ERC721 functions                              //
    ////////////////////////////////////////////////////////////////////////////////

    function balanceOf(address owner) public view returns(uint256) {
        require(msg.sender != address(0), "ERC721: balance query for the zero address");
        return ownedAssetCount[owner];
    }

    function ownerOf(uint256 tokenId) public view returns(address) {
        address owner = assetOwner[tokenId];
        require(owner != address(0), "No Asset Exists");
        return owner;
    }

    function transferFrom(address payable from, uint256 assetId) public payable {
        // اکانتی که قصد دارد این توکن را انتقال دهد یا باید خود مالک باشد یا از سمت مالک تایید شده باشد
        require(isApprovedOrOwner(msg.sender, assetId), "Not An Approved Owner");

        // توکن را فقط از مالک آن میتوانیم خرید کنیم
        require(ownerOf(assetId) == from, "Not The Asset Owner");

        // فراخوانی کننده این فانکشن باید قیمت توکن را پرداخت کرده باشد تا بتواند این توکن را انتقال دهد
        require(msg.value == assetMap[assetId].price * 10**18, "Not enough Value");

        clearApproval(assetId, getApproved(assetId));

        // از تعداد توکن های مالک قبلی یک واحد کم میکنیم
        ownedAssetCount[from]--; //     x--   ~   x = x -1

        /* چک شود اگر تعداد توکن یک شخص صفر شود از مپینگ حذفش کنیم
            if(ownedAssetCount[from] == 0) {
                delete ownedAssetCount[from];
            }
        */

        // بخ تعداد توکن های مالک جدید یک واحد اضافه میکنیم
        ownedAssetCount[msg.sender]++;

        // آدرس مالک جدید را برای توکن ست میکنیم
        assetOwner[assetId] = msg.sender;

        // قیمت توکن که اکنون در اسمارت کانترکت نشسته، به مالک قبلی انتقال داده می شود
        from.transfer(assetMap[assetId].price * 10**18);

        emit Transfer(from, msg.sender, assetId);
    }

    function approve(address to, uint256 assetId) public {
        address owner = ownerOf(assetId);

        require(to != owner, "Current Owner Approval");

        // فقط مالک توکن اجازه دارد که بقیه اکانت ها را تایید کند
        require(msg.sender == owner, "Not The Asset Owner");

        assetApprovals[assetId] = to;

        emit Approval(owner, to, assetId);
    }

    function getApproved(uint256 assetId) public view returns(address) {
        require(exists(assetId), "ERC721: approved query for nonexistent token");
        return assetApprovals[assetId];
    }


    ////////////////////////////////////////////////////////////////////////////////
    //             Functions used internally by another functions                 //
    ////////////////////////////////////////////////////////////////////////////////
    function mint(address to, uint256 assetId) internal {

        require(to != address(0), "Zero Address Minting");
        require(!exists(assetId), "Alreasy Minted Asset");

        assetOwner[assetId] = to;
        ownedAssetCount[to]++;

        emit Transfer(address(0), to, assetId);
    }

    function exists(uint256 assetId) internal view returns(bool) {
        return assetOwner[assetId] != address(0);
    }

    function isApprovedOrOwner(address spender, uint assetId) internal view returns(bool) {
        require(exists(assetId), "ERC721: operator query for nonexistent token");

        address owner = ownerOf(assetId);

        return (spender == owner || spender == getApproved(assetId));
    }


    ////////////////////////////////////////////////////////////////////////////////
    //                     Unused ERC721 functions                                //
    ////////////////////////////////////////////////////////////////////////////////

    bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;

    mapping (address => mapping (address => bool)) private _operatorApprovals;

    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function setApprovalForAll(address to, bool approved) public {
        require(to != msg.sender, "ERC721: approve to caller");
        _operatorApprovals[msg.sender][to] = approved;
        emit ApprovalForAll(msg.sender, to, approved);
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) public {
        transferFrom(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, _data), "ERC721: transfer to non ERC721Receiver implementer");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public {
        safeTransferFrom(from, to, tokenId, "");
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory _data) internal returns (bool) {
        if (!to.isContract()) {
            return true;
        }
        bytes4 retval = IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, _data);
        return (retval == _ERC721_RECEIVED);
    }



    ////////////////////////////////////////////////////////////////////////////////
    //                 Additional functions added to the  token                   //
    ////////////////////////////////////////////////////////////////////////////////

    function addAsset(uint256 price, address to) public {
        
        // فقط اکانت سوپروایزر قادر به اضافه کردن توکن است
        require(msg.sender == supervisor, "only supervisor can call this function!");

        // ایجاد دارایی
        assetMap[assetCount] = Asset(assetCount, price);       // price : Eth   ,  assetCount ~ assetId

        // انتصاب دارایی به مالک
        mint(to, assetCount);

        assetCount++;
    }


    function clearApproval(uint256 assetId, address approved) internal {
        if(approved == assetApprovals[assetId]) {
            assetApprovals[assetId] = address(0);
        } 
    }

    // افزایش قیمت توکن
    function appreciate(uint256 assetId, uint256 value) public {
        // فقط اکانت سوپروایزر می تواند این تابع را صدا بزند
        require(msg.sender == supervisor, "Only supervisor Can call this Function!");

        Asset memory oldAsset = assetMap[assetId];
        assetMap[assetId] = Asset(oldAsset.assetId, oldAsset.price + value);   // value , price : Eth
    }


    // کاهش قیمت توکن
    function depreciate(uint256 assetId, uint256 value) public {
        // فقط اکانت سوپروایزر می تواند این تابع را صدا بزند
        require(msg.sender == supervisor, "Only supervisor Can call this Function!");

        Asset memory oldAsset = assetMap[assetId];
        assetMap[assetId] = Asset(oldAsset.assetId, oldAsset.price - value);   // value , price : Eth
    }

    function getAssetsSize() public view returns(uint256) {
        return assetCount;
    }
}