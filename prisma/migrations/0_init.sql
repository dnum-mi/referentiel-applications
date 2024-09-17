CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SEQUENCE IF NOT EXISTS "newtable_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "newtable_id_seq" OWNER TO "postgres";

CREATE TYPE "app_compliance_level" AS ENUM (
  'Dispensée',
  'Non passée',
  'Partielle',
  'Complète',
  'Obsolète'
);
ALTER TYPE "app_compliance_level" OWNER TO "postgres";
CREATE TYPE "app_data_flow_orient" AS ENUM (
  'push',
  'pull',
  'bi-directional'
);
ALTER TYPE "app_data_flow_orient" OWNER TO "postgres";
CREATE TYPE "app_flow_status" AS ENUM (
  'actif',
  'inactif'
);
ALTER TYPE "app_flow_status" OWNER TO "postgres";
CREATE TYPE "env_protection" AS ENUM (
  'NP',
  'DR',
  'Secret',
  'Très secret'
);
ALTER TYPE "env_protection" OWNER TO "postgres";
CREATE TYPE "env_status" AS ENUM (
  'En construction',
  'Actif',
  'Inactif'
);
ALTER TYPE "env_status" OWNER TO "postgres";
CREATE TYPE "env_type" AS ENUM (
  'CaaS',
  'IaaS',
  'VM',
  'BarMetal'
);
ALTER TYPE "env_type" OWNER TO "postgres";
CREATE TYPE "prj_app_type" AS ENUM (
  'Contributing',
  'Managed'
);
ALTER TYPE "prj_app_type" OWNER TO "postgres";
CREATE TABLE "abs_tracability" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
;
ALTER TABLE "abs_tracability" OWNER TO "postgres";
CREATE TABLE "act_actor" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL DEFAULT now(),
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL DEFAULT now(),
  "comments" text COLLATE "pg_catalog"."default",
  "actorid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "email" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "organisationunitid" uuid,
  "validationdate" date NOT NULL,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "act_actor" OWNER TO "postgres";
CREATE TABLE "act_actorcode" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "actorid" uuid NOT NULL,
  "actorcodetype" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "actorcode" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "act_actorcode" OWNER TO "postgres";
CREATE TABLE "act_actorcodetype" (
  "actorcodetype" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "act_actorcodetype" OWNER TO "postgres";
CREATE TABLE "app_application" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL DEFAULT now(),
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL DEFAULT now(),
  "comments" text COLLATE "pg_catalog"."default",
  "applicationid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "parentid" uuid,
  "longname" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "status" char(3) COLLATE "pg_catalog"."default" NOT NULL,
  "organisationunitid" uuid NOT NULL,
  "sensitivity" char(2) COLLATE "pg_catalog"."default" NOT NULL,
  "apptype" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "app_application" OWNER TO "postgres";
CREATE TABLE "app_applicationid" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "applicationid" uuid NOT NULL,
  "applicationidtypecode" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "shortcode" varchar(20) COLLATE "pg_catalog"."default" NOT NULL,
  "longcode" varchar(200) COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "app_applicationid" OWNER TO "postgres";
CREATE TABLE "app_compliance" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "applicationid" uuid NOT NULL,
  "compliancetype" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "compliancelevel" "public"."app_compliance_level" NOT NULL DEFAULT 'Non passée'::app_compliance_level,
  "decisiondate" date,
  "validitydate" date,
  "auditdate" date,
  "description" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "app_compliance" OWNER TO "postgres";
CREATE TABLE "app_compliancetype" (
  "compliancetype" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "referenceurl" text COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "app_compliancetype" OWNER TO "postgres";
CREATE TABLE "app_flow" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "flowid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "applicationsourceid" uuid,
  "organisationunitsourceid" uuid,
  "applicationtargetid" uuid,
  "organisationunittargetid" uuid,
  "middleware" text COLLATE "pg_catalog"."default",
  "flowtypeid" varchar(5) COLLATE "pg_catalog"."default",
  "flowprotocolid" varchar(5) COLLATE "pg_catalog"."default",
  "flowperiodid" varchar(5) COLLATE "pg_catalog"."default",
  "flowdataorientation" "public"."app_data_flow_orient" NOT NULL,
  "ports" varchar(200) COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "app_flow" OWNER TO "postgres";
CREATE TABLE "app_flowdata" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "flowid" uuid NOT NULL,
  "dataid" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "datadescription" text COLLATE "pg_catalog"."default",
  "dataurl" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "app_flowdata" OWNER TO "postgres";
CREATE TABLE "app_flowperiod" (
  "flowperiodid" varchar(5) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(200) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "app_flowperiod" OWNER TO "postgres";
CREATE TABLE "app_flowprotocol" (
  "flowprotocolid" varchar(5) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(200) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "app_flowprotocol" OWNER TO "postgres";
CREATE TABLE "app_flowtype" (
  "flowtypeid" varchar(5) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(200) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "app_flowtype" OWNER TO "postgres";
CREATE TABLE "app_idtype" (
  "applicationidtypecode" char(6) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "app_idtype" OWNER TO "postgres";
CREATE TABLE "app_instance" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "environmentid" uuid NOT NULL,
  "applicationid" uuid NOT NULL,
  "instancerole" char(1) COLLATE "pg_catalog"."default" DEFAULT 'E'::bpchar,
  "instancestatus" char(3) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'PRD'::bpchar,
  "tenant" text COLLATE "pg_catalog"."default",
  "fip" text COLLATE "pg_catalog"."default",
  "url" text COLLATE "pg_catalog"."default",
  "deploymentdate" date,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "app_instance" OWNER TO "postgres";
CREATE TABLE "app_instancerole" (
  "instancerole" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "label" text COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "app_instancerole" OWNER TO "postgres";
CREATE TABLE "app_instancestatus" (
  "instancestatus" char(3) COLLATE "pg_catalog"."default" NOT NULL,
  "label" text COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "app_instancestatus" OWNER TO "postgres";
CREATE TABLE "app_interface" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "interfaceid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "interfacetypeid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "applicationdatasource" uuid,
  "applicationdistribution" uuid,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "app_interface" OWNER TO "postgres";
CREATE TABLE "app_interfacetype" (
  "interfacetypeid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "app_interfacetype" OWNER TO "postgres";
CREATE TABLE "app_status" (
  "applicationstatuscode" char(3) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "app_status" OWNER TO "postgres";
CREATE TABLE "app_type" (
  "applicationtypecode" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "app_type" OWNER TO "postgres";
CREATE TABLE "env_environment" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "environmentid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "label" text COLLATE "pg_catalog"."default" NOT NULL,
  "organisation" text COLLATE "pg_catalog"."default" NOT NULL,
  "environmenttype" "public"."env_type" NOT NULL DEFAULT 'CaaS'::env_type,
  "environmentprotection" "public"."env_protection" NOT NULL DEFAULT 'NP'::env_protection,
  "environmentstatus" "public"."env_status" NOT NULL DEFAULT 'Actif'::env_status,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "env_environment" OWNER TO "postgres";
CREATE TABLE "fct_capability" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "capabilityid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "parentid" uuid,
  "label" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "fct_capability" OWNER TO "postgres";
CREATE TABLE "fct_capabilityrealisation" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "applicationid" uuid NOT NULL,
  "capabilityid" uuid NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "fct_capabilityrealisation" OWNER TO "postgres";
CREATE TABLE "fct_urbanzone" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "urbanzoneid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "parentid" uuid,
  "label" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "fct_urbanzone" OWNER TO "postgres";
CREATE TABLE "fct_urbanzoneapplication" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "urbanzoneid" uuid NOT NULL,
  "applicationid" uuid NOT NULL,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "fct_urbanzoneapplication" OWNER TO "postgres";
CREATE TABLE "fct_urbanzoneresponsability" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "urbanzoneid" uuid NOT NULL,
  "organisationunitid" uuid NOT NULL,
  "roleid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "fct_urbanzoneresponsability" OWNER TO "postgres";
CREATE TABLE "org_organisationunit" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "organisationunitid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "parentid" uuid,
  "organisationcode" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "label" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "org_organisationunit" OWNER TO "postgres";
CREATE TABLE "org_roletype" (
  "roleid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(200) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "org_roletype" OWNER TO "postgres";
CREATE TABLE "prj_applicationrole" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL DEFAULT now(),
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL DEFAULT now(),
  "comments" text COLLATE "pg_catalog"."default",
  "applicationid" uuid NOT NULL,
  "actorid" uuid,
  "organisationunitid" uuid NOT NULL,
  "roleid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "validationdate" date NOT NULL,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "prj_applicationrole" OWNER TO "postgres";
CREATE TABLE "prj_project" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "projectid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "label" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "parentid" uuid,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "prj_project" OWNER TO "postgres";
CREATE TABLE "prj_projectapplication" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "projectid" uuid NOT NULL,
  "applicationid" uuid NOT NULL,
  "applicationrole" "public"."prj_app_type" NOT NULL DEFAULT 'Managed'::prj_app_type,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "prj_projectapplication" OWNER TO "postgres";
CREATE TABLE "prj_projectresponsability" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "projectid" uuid NOT NULL,
  "actorid" uuid NOT NULL,
  "organisationunitid" uuid NOT NULL,
  "roleid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "prj_projectresponsability" OWNER TO "postgres";
CREATE TABLE "ptf_portfolio" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "portfolioid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "label" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "parentid" uuid,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "ptf_portfolio" OWNER TO "postgres";
CREATE TABLE "ptf_portfolioapplication" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "portfolioid" uuid NOT NULL,
  "applicationid" uuid NOT NULL,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "ptf_portfolioapplication" OWNER TO "postgres";
CREATE TABLE "ptf_portfolioresponsability" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "portfolioid" uuid NOT NULL,
  "actorid" uuid NOT NULL,
  "organisationunitid" uuid NOT NULL,
  "roleid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "desription" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "ptf_portfolioresponsability" OWNER TO "postgres";
CREATE TABLE "ref_sensitivity" (
  "sensitivitycode" char(2) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(200) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "ref_sensitivity" OWNER TO "postgres";
CREATE TABLE "resources" (
  "id" int4 NOT NULL DEFAULT nextval('newtable_id_seq'::regclass),
  "resource" varchar COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "resources" OWNER TO "postgres";
CREATE TABLE "roles" (
  "roleid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "resourceid" int4 NOT NULL,
  "create_all" bool NOT NULL DEFAULT false,
  "create_own" bool NOT NULL DEFAULT false,
  "read_all" bool NOT NULL DEFAULT false,
  "read_own" bool NOT NULL DEFAULT false,
  "update_all" bool NOT NULL DEFAULT false,
  "update_own" bool NOT NULL DEFAULT false,
  "delete_all" bool NOT NULL DEFAULT false,
  "delete_own" bool NOT NULL DEFAULT false
)
;
ALTER TABLE "roles" OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_generate_v1"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_generate_v1'
  LANGUAGE c VOLATILE STRICT
  COST 1;
ALTER FUNCTION "uuid_generate_v1"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_generate_v1mc"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_generate_v1mc'
  LANGUAGE c VOLATILE STRICT
  COST 1;
ALTER FUNCTION "uuid_generate_v1mc"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_generate_v3"("namespace" uuid, "name" text)
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_generate_v3'
  LANGUAGE c IMMUTABLE STRICT
  COST 1;
ALTER FUNCTION "uuid_generate_v3"("namespace" uuid, "name" text) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_generate_v4"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_generate_v4'
  LANGUAGE c VOLATILE STRICT
  COST 1;
ALTER FUNCTION "uuid_generate_v4"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_generate_v5"("namespace" uuid, "name" text)
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_generate_v5'
  LANGUAGE c IMMUTABLE STRICT
  COST 1;
ALTER FUNCTION "uuid_generate_v5"("namespace" uuid, "name" text) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_nil"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_nil'
  LANGUAGE c IMMUTABLE STRICT
  COST 1;
ALTER FUNCTION "uuid_nil"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_ns_dns"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_ns_dns'
  LANGUAGE c IMMUTABLE STRICT
  COST 1;
ALTER FUNCTION "uuid_ns_dns"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_ns_oid"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_ns_oid'
  LANGUAGE c IMMUTABLE STRICT
  COST 1;
ALTER FUNCTION "uuid_ns_oid"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_ns_url"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_ns_url'
  LANGUAGE c IMMUTABLE STRICT
  COST 1;
ALTER FUNCTION "uuid_ns_url"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_ns_x500"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_ns_x500'
  LANGUAGE c IMMUTABLE STRICT
  COST 1;
ALTER FUNCTION "uuid_ns_x500"() OWNER TO "postgres";

ALTER TABLE "abs_tracability" ADD CONSTRAINT "abs_tracability_pk" PRIMARY KEY ("id");
ALTER TABLE "act_actor" ADD CONSTRAINT "act_actor_pkey" PRIMARY KEY ("actorid");
ALTER TABLE "act_actorcode" ADD CONSTRAINT "act_actorcode_pk" PRIMARY KEY ("actorid", "actorcode");
ALTER TABLE "act_actorcodetype" ADD CONSTRAINT "act_actorcodetype_pkey" PRIMARY KEY ("actorcodetype");
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_pkey" PRIMARY KEY ("applicationid");
ALTER TABLE "app_applicationid" ADD CONSTRAINT "app_applicationid_pk" PRIMARY KEY ("shortcode", "applicationidtypecode", "applicationid");
ALTER TABLE "app_compliance" ADD CONSTRAINT "app_compliance_pk" PRIMARY KEY ("applicationid", "compliancetype");
ALTER TABLE "app_compliancetype" ADD CONSTRAINT "app_compliancetype_pkey" PRIMARY KEY ("compliancetype");
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_pkey" PRIMARY KEY ("flowid");
ALTER TABLE "app_flowdata" ADD CONSTRAINT "app_flowdata_pk" PRIMARY KEY ("flowid", "dataid");
ALTER TABLE "app_flowperiod" ADD CONSTRAINT "app_flowperiod_pkey" PRIMARY KEY ("flowperiodid");
ALTER TABLE "app_flowprotocol" ADD CONSTRAINT "app_flowprotocol_pkey" PRIMARY KEY ("flowprotocolid");
ALTER TABLE "app_flowtype" ADD CONSTRAINT "app_flowtype_pkey" PRIMARY KEY ("flowtypeid");
ALTER TABLE "app_idtype" ADD CONSTRAINT "app_idtype_pkey" PRIMARY KEY ("applicationidtypecode");
ALTER TABLE "app_instance" ADD CONSTRAINT "app_instance_pk" PRIMARY KEY ("id");
ALTER TABLE "app_instancerole" ADD CONSTRAINT "app_instancerole_pkey" PRIMARY KEY ("instancerole");
ALTER TABLE "app_instancestatus" ADD CONSTRAINT "app_instancestatus_pkey" PRIMARY KEY ("instancestatus");
ALTER TABLE "app_interface" ADD CONSTRAINT "app_interface_pk" PRIMARY KEY ("interfaceid");
ALTER TABLE "app_interfacetype" ADD CONSTRAINT "app_interfacetype_pkey" PRIMARY KEY ("interfacetypeid");
ALTER TABLE "app_status" ADD CONSTRAINT "app_status_pkey" PRIMARY KEY ("applicationstatuscode");
ALTER TABLE "app_type" ADD CONSTRAINT "app_type_pkey" PRIMARY KEY ("applicationtypecode");
ALTER TABLE "env_environment" ADD CONSTRAINT "env_environment_pkey" PRIMARY KEY ("environmentid");
ALTER TABLE "fct_capability" ADD CONSTRAINT "fct_capability_pkey" PRIMARY KEY ("capabilityid");
ALTER TABLE "fct_capabilityrealisation" ADD CONSTRAINT "fct_capabilityrealisation_pk" PRIMARY KEY ("applicationid", "capabilityid");
ALTER TABLE "fct_urbanzone" ADD CONSTRAINT "fct_urbanzone_pkey" PRIMARY KEY ("urbanzoneid");
ALTER TABLE "fct_urbanzoneapplication" ADD CONSTRAINT "fct_urbanzoneapplication_pk" PRIMARY KEY ("urbanzoneid", "applicationid");
ALTER TABLE "fct_urbanzoneresponsability" ADD CONSTRAINT "fct_urbanzoneresponsability_pk" PRIMARY KEY ("urbanzoneid", "organisationunitid", "roleid");
ALTER TABLE "org_organisationunit" ADD CONSTRAINT "org_organisationunit_pkey" PRIMARY KEY ("organisationunitid");
ALTER TABLE "org_roletype" ADD CONSTRAINT "org_roletype_pkey" PRIMARY KEY ("roleid");
ALTER TABLE "prj_applicationrole" ADD CONSTRAINT "prj_applicationrole_pk" PRIMARY KEY ("applicationid", "roleid", "organisationunitid");
ALTER TABLE "prj_project" ADD CONSTRAINT "prj_project_pkey" PRIMARY KEY ("projectid");
ALTER TABLE "prj_projectapplication" ADD CONSTRAINT "prj_projectapplication_pk" PRIMARY KEY ("projectid", "applicationid", "applicationrole");
ALTER TABLE "prj_projectresponsability" ADD CONSTRAINT "prj_projectresponsability_pk" PRIMARY KEY ("roleid", "organisationunitid", "actorid", "projectid");
ALTER TABLE "ptf_portfolio" ADD CONSTRAINT "ptf_portfolio_pkey" PRIMARY KEY ("portfolioid");
ALTER TABLE "ptf_portfolioapplication" ADD CONSTRAINT "ptf_portfolioapplication_pk" PRIMARY KEY ("portfolioid", "applicationid");
ALTER TABLE "ptf_portfolioresponsability" ADD CONSTRAINT "ptf_portfolioresponsability_pk" PRIMARY KEY ("portfolioid", "actorid", "organisationunitid", "roleid");
ALTER TABLE "ref_sensitivity" ADD CONSTRAINT "ref_sensitivity_pkey" PRIMARY KEY ("sensitivitycode");
ALTER TABLE "resources" ADD CONSTRAINT "newtable_pk" PRIMARY KEY ("id");
ALTER TABLE "roles" ADD CONSTRAINT "roles_pk" PRIMARY KEY ("roleid", "resourceid");
ALTER TABLE "act_actor" ADD CONSTRAINT "email" UNIQUE ("email");
ALTER TABLE "act_actor" ADD CONSTRAINT "act_actor_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "act_actorcode" ADD CONSTRAINT "act_actorcode_actorcodetype_fkey" FOREIGN KEY ("actorcodetype") REFERENCES "public"."act_actorcodetype" ("actorcodetype") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "act_actorcode" ADD CONSTRAINT "act_actorcode_actorid_fkey" FOREIGN KEY ("actorid") REFERENCES "public"."act_actor" ("actorid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_apptype_fkey" FOREIGN KEY ("apptype") REFERENCES "public"."app_type" ("applicationtypecode") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_sensitivity_fkey" FOREIGN KEY ("sensitivity") REFERENCES "public"."ref_sensitivity" ("sensitivitycode") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_status_fkey" FOREIGN KEY ("status") REFERENCES "public"."app_status" ("applicationstatuscode") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_applicationid" ADD CONSTRAINT "app_applicationid_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_applicationid" ADD CONSTRAINT "app_applicationid_applicationidtypecode_fkey" FOREIGN KEY ("applicationidtypecode") REFERENCES "public"."app_idtype" ("applicationidtypecode") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_compliance" ADD CONSTRAINT "app_compliance_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_compliance" ADD CONSTRAINT "app_compliance_compliancetype_fkey" FOREIGN KEY ("compliancetype") REFERENCES "public"."app_compliancetype" ("compliancetype") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_applicationsourceid_fkey" FOREIGN KEY ("applicationsourceid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_applicationtargetid_fkey" FOREIGN KEY ("applicationtargetid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_flowperiodid_fkey" FOREIGN KEY ("flowperiodid") REFERENCES "public"."app_flowperiod" ("flowperiodid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_flowprotocolid_fkey" FOREIGN KEY ("flowprotocolid") REFERENCES "public"."app_flowprotocol" ("flowprotocolid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_flowtypeid_fkey" FOREIGN KEY ("flowtypeid") REFERENCES "public"."app_flowtype" ("flowtypeid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_organisationunitsourceid_fkey" FOREIGN KEY ("organisationunitsourceid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_organisationunittargetid_fkey" FOREIGN KEY ("organisationunittargetid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flowdata" ADD CONSTRAINT "app_flowdata_flowid_fkey" FOREIGN KEY ("flowid") REFERENCES "public"."app_flow" ("flowid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_instance" ADD CONSTRAINT "app_instance_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_instance" ADD CONSTRAINT "app_instance_environmentid_fkey" FOREIGN KEY ("environmentid") REFERENCES "public"."env_environment" ("environmentid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_instance" ADD CONSTRAINT "app_instance_instancerole_fkey" FOREIGN KEY ("instancerole") REFERENCES "public"."app_instancerole" ("instancerole") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_instance" ADD CONSTRAINT "app_instance_instancestatus_fkey" FOREIGN KEY ("instancestatus") REFERENCES "public"."app_instancestatus" ("instancestatus") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_interface" ADD CONSTRAINT "app_interface_applicationdatasource_fkey" FOREIGN KEY ("applicationdatasource") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_interface" ADD CONSTRAINT "app_interface_applicationdistribution_fkey" FOREIGN KEY ("applicationdistribution") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_interface" ADD CONSTRAINT "app_interface_interfacetypeid_fkey" FOREIGN KEY ("interfacetypeid") REFERENCES "public"."app_interfacetype" ("interfacetypeid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_capability" ADD CONSTRAINT "fct_capability_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "public"."fct_capability" ("capabilityid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_capabilityrealisation" ADD CONSTRAINT "fct_capabilityrealisation_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_capabilityrealisation" ADD CONSTRAINT "fct_capabilityrealisation_capabilityid_fkey" FOREIGN KEY ("capabilityid") REFERENCES "public"."fct_capability" ("capabilityid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_urbanzone" ADD CONSTRAINT "fct_urbanzone_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "public"."fct_urbanzone" ("urbanzoneid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_urbanzoneapplication" ADD CONSTRAINT "fct_urbanzoneapplication_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_urbanzoneapplication" ADD CONSTRAINT "fct_urbanzoneapplication_urbanzoneid_fkey" FOREIGN KEY ("urbanzoneid") REFERENCES "public"."fct_urbanzone" ("urbanzoneid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_urbanzoneresponsability" ADD CONSTRAINT "fct_urbanzoneresponsability_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_urbanzoneresponsability" ADD CONSTRAINT "fct_urbanzoneresponsability_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "public"."org_roletype" ("roleid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_urbanzoneresponsability" ADD CONSTRAINT "fct_urbanzoneresponsability_urbanzoneid_fkey" FOREIGN KEY ("urbanzoneid") REFERENCES "public"."fct_urbanzone" ("urbanzoneid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "org_organisationunit" ADD CONSTRAINT "org_organisationunit_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_applicationrole" ADD CONSTRAINT "prj_applicationrole_actorid_fkey" FOREIGN KEY ("actorid") REFERENCES "public"."act_actor" ("actorid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_applicationrole" ADD CONSTRAINT "prj_applicationrole_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_applicationrole" ADD CONSTRAINT "prj_applicationrole_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_applicationrole" ADD CONSTRAINT "prj_applicationrole_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "public"."org_roletype" ("roleid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_project" ADD CONSTRAINT "prj_project_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "public"."prj_project" ("projectid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_projectapplication" ADD CONSTRAINT "prj_projectapplication_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_projectapplication" ADD CONSTRAINT "prj_projectapplication_projectid_fkey" FOREIGN KEY ("projectid") REFERENCES "public"."prj_project" ("projectid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_projectresponsability" ADD CONSTRAINT "prj_projectresponsability_actorid_fkey" FOREIGN KEY ("actorid") REFERENCES "public"."act_actor" ("actorid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_projectresponsability" ADD CONSTRAINT "prj_projectresponsability_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_projectresponsability" ADD CONSTRAINT "prj_projectresponsability_projectid_fkey" FOREIGN KEY ("projectid") REFERENCES "public"."prj_project" ("projectid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_projectresponsability" ADD CONSTRAINT "prj_projectresponsability_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "public"."org_roletype" ("roleid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ptf_portfolio" ADD CONSTRAINT "ptf_portfolio_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "public"."ptf_portfolio" ("portfolioid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ptf_portfolioapplication" ADD CONSTRAINT "ptf_portfolioapplication_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ptf_portfolioapplication" ADD CONSTRAINT "ptf_portfolioapplication_portfolioid_fkey" FOREIGN KEY ("portfolioid") REFERENCES "public"."ptf_portfolio" ("portfolioid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ptf_portfolioresponsability" ADD CONSTRAINT "ptf_portfolioresponsability_actorid_fkey" FOREIGN KEY ("actorid") REFERENCES "public"."act_actor" ("actorid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ptf_portfolioresponsability" ADD CONSTRAINT "ptf_portfolioresponsability_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ptf_portfolioresponsability" ADD CONSTRAINT "ptf_portfolioresponsability_portfolioid_fkey" FOREIGN KEY ("portfolioid") REFERENCES "public"."ptf_portfolio" ("portfolioid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ptf_portfolioresponsability" ADD CONSTRAINT "ptf_portfolioresponsability_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "public"."org_roletype" ("roleid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "resources" ADD CONSTRAINT "newtable_un" UNIQUE ("resource");
ALTER TABLE "roles" ADD CONSTRAINT "roles_fk" FOREIGN KEY ("roleid") REFERENCES "public"."org_roletype" ("roleid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_fk_1" FOREIGN KEY ("resourceid") REFERENCES "public"."resources" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
